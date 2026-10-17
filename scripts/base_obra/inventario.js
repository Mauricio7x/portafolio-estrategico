"use strict";
/* Base nacional de licitaciones de obra · FASE 0: inventario y calidad (17-oct-2026).
   Uso:  node scripts/base_obra/inventario.js <carpeta_de_salida> [desde=2024-01-01] [--reusar]
   Solo LEE datos abiertos (datos.gov.co) y escribe en la carpeta dada, que va FUERA del
   repositorio. No toca producción, Redis ni Vercel. Transporte: lib/socrata.crearCliente
   (reintentos, 429/5xx con retroceso, token opcional que no puede parar nada).
   Paginación por KEYSET sobre :id (MEMORIA «Decisiones que no hay que re-aprender»: nunca
   $offset, pierde/duplica filas en vivo). Un conteo que falla es «sin medir», jamás 0. */
const fs = require("fs");
const path = require("path");
const { crearCliente, escSoQL } = require("../../lib/socrata");
const L = require("./limpieza");
const { norm } = require("../../lib/semantica");

const RAIZ = "https://www.datos.gov.co/resource/";
const DS = { procesos: "p6dx-8zbt", ofertas: "wi7w-2nvm", ofertas_hist: "b28v-edj8",
  contratos: "jbjy-vk9h", paa: "9sue-ezhx" };
// Respaldo si el inventario falla: los literales medidos el 17-oct-2026.
const MODALIDADES_P6DX_LITERALES = ["Licitación pública", "Licitación pública Obra Publica",
  "Selección Abreviada de Menor Cuantía", "Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes", "Mínima cuantía"];
const PAGINA = 5000, LOTE_IDS = 40, TOPE_GRUPOS = 50000;
/* Las ofertas se piden AGRUPADAS en el servidor por (proceso, proveedor, valor) con count(*):
   un solo proceso por lotes trae 305.634 filas en wi7w que se reducen a 381 grupos (medido el
   17-oct-2026), y con `*` la corrida llegó a 6,7 GB. 40 ids por consulta: ~1,5 s; con 80, 15 s. */
const GRUPO_OFERTA = "id_del_proceso_de_compra,nit_del_proveedor,c_digo_proveedor,nombre_proveedor,valor_de_la_oferta";
async function ofertasAgrupadas(cli, ids, etiqueta) {
  const r = await cli.pedir({ $select: `${GRUPO_OFERTA},count(*) AS n,min(fecha_de_registro) AS fecha`,
    $where: enLista("id_del_proceso_de_compra", ids), $group: GRUPO_OFERTA, $limit: TOPE_GRUPOS }, etiqueta);
  if (!Array.isArray(r)) throw new Error(`${etiqueta}: respuesta no es lista`);
  if (r.length >= TOPE_GRUPOS) { const e = new Error(`${etiqueta}: ${r.length} grupos, tope alcanzado`); e.tope = true; throw e; }
  return r;
}

const log = (m) => process.stderr.write(m + "\n");
const cliente = (ds) => crearCliente({ baseUrl: RAIZ + DS[ds] + ".json", log });
const ahora = () => new Date().toISOString();

async function medir(etiqueta, fn) {
  try { return { ok: true, valor: await fn(), corte: ahora() }; }
  catch (e) { log(`SIN MEDIR ${etiqueta}: ${e.detalle || e.message}`);
    return { ok: false, sin_medir: true, status: e.status || null, error: e.detalle || e.message, corte: ahora() }; }
}

/* Todas las filas que casan con $where, por keyset :id. */
async function todas(cli, where, select, etiqueta) {
  const out = []; let ultimo = null;
  for (;;) {
    const w = ultimo ? `(${where}) AND :id > '${escSoQL(ultimo)}'` : where;
    const filas = await cli.pedir({ $select: select, $where: w, $order: ":id", $limit: PAGINA }, etiqueta);
    if (!Array.isArray(filas)) throw new Error(`${etiqueta}: respuesta no es lista`);
    out.push(...filas);
    if (filas.length < PAGINA) return out;
    ultimo = filas[filas.length - 1][":id"];
    if (!ultimo) throw new Error(`${etiqueta}: página llena sin :id para continuar`);
  }
}

const enLista = (col, ids) => `${col} in (${ids.map((i) => `'${escSoQL(i)}'`).join(",")})`;
function trozos(xs, n) { const o = []; for (let i = 0; i < xs.length; i += n) o.push(xs.slice(i, i + n)); return o; }
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const pct = (a, b) => (b > 0 ? Math.round((1000 * a) / b) / 10 : null);

/* Lugar de ejecución desde la dirección de jbjy: «…\nMunicipio\nDepartamento\nCOLOMBIA». */
function lugarDeDireccion(dir) {
  const ls = String(dir || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (ls.length < 3) return null;
  if (!/^colombia$/i.test(ls[ls.length - 1] || "")) return null;
  return { municipio: ls[ls.length - 3] || null, departamento: ls[ls.length - 2] || null };
}

async function main() {
  const salida = process.argv[2];
  const desde = process.argv.slice(3).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || "2024-01-01";
  if (!salida) { log("uso: node scripts/base_obra/inventario.js <carpeta_de_salida> [desde]"); process.exit(2); }
  fs.mkdirSync(salida, { recursive: true });
  const R = { desde, inicio: ahora(), fuentes: {}, notas: [] };
  const P = cliente("procesos");
  const whereObra = `tipo_de_contrato='Obra' AND fecha_de_publicacion_del >= '${desde}T00:00:00'`;

  /* 1 · Inventario exacto de modalidades × adjudicado (obra, desde). */
  R.modalidades = await medir("modalidades p6dx", () => P.pedir({
    $select: "modalidad_de_contratacion,adjudicado,count(*) AS n", $where: whereObra,
    $group: "modalidad_de_contratacion,adjudicado", $order: "n DESC", $limit: 1000 }, "modalidades"));

  /* 2 · Filas de las modalidades competitivas, todas (adjudicadas o no). */
  const whereComp = `${whereObra} AND ${enLista("modalidad_de_contratacion",
    (R.modalidades.ok ? [...new Set(R.modalidades.valor.map((r) => r.modalidad_de_contratacion))] : MODALIDADES_P6DX_LITERALES)
      .filter((m) => L.clasificarModalidad(m) !== "otra"))}`;
  /* `--reusar`: si la carpeta ya trae la descarga de p6dx, se usa (su corte queda anotado). */
  const archP = path.join(salida, "p6dx_obra.json");
  let filas;
  if (process.argv.includes("--reusar") && fs.existsSync(archP)) {
    filas = JSON.parse(fs.readFileSync(archP, "utf8"));
    R.fuentes.procesos = { dataset: DS.procesos, filas: filas.length, corte: fs.statSync(archP).mtime.toISOString(), reusado: true };
  } else {
    filas = await todas(P, whereComp, "*,:id", "p6dx competitivas");
    R.fuentes.procesos = { dataset: DS.procesos, filas: filas.length, corte: ahora() };
    fs.writeFileSync(archP, JSON.stringify(filas));
  }

  /* 3 · Una fila por proceso (id_del_portafolio), regla declarada en limpieza.elegirFila. */
  const grupos = new Map(); let sinPortafolio = 0;
  for (const f of filas) {
    const k = f.id_del_portafolio;
    if (!k) { sinPortafolio++; continue; }
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(f);
  }
  const procesos = [];
  const multi = { procesos: 0, filas_extra: 0, adjudicacion_discrepa: 0, con_precio_base_distinto: 0 };
  for (const [k, fs_] of grupos) {
    const f = L.elegirFila(fs_);
    if (fs_.length > 1) {
      multi.procesos++; multi.filas_extra += fs_.length - 1;
      if (new Set(fs_.map((x) => x.adjudicado)).size > 1) multi.adjudicacion_discrepa++;
      if (L.lotePorPrecioBase(fs_)) multi.con_precio_base_distinto++;
    }
    procesos.push({ portafolio: k, fila: f, n_filas: fs_.length, lote_p6dx: L.lotePorPrecioBase(fs_),
      mod: L.clasificarModalidad(f.modalidad_de_contratacion) });
  }
  R.procesos = { distintos: procesos.length, sin_portafolio: sinPortafolio, varias_filas: multi };

  /* 4 · Ofertas de los adjudicados, por lista de ids, en wi7w y en b28v. */
  const adj = procesos.filter((p) => p.fila.adjudicado === "Si");
  const ofertasDe = new Map();
  const fallosOfertas = []; const idsSinMedir = new Set();
  for (const ds of ["ofertas", "ofertas_hist"]) {
    const C = cliente(ds); let n = 0; const lotes = trozos(adj.map((p) => p.portafolio), LOTE_IDS);
    for (const [i, lote] of lotes.entries()) {
      if (i % 20 === 0) log(`${DS[ds]}: lote ${i + 1}/${lotes.length} · ${n} grupos · ${ahora()}`);
      /* Un lote que falla se parte en mitades hasta 1 id; el id que aun así falla queda
         «sin medir» (con su error literal), jamás «sin ofertas». */
      const bajar = async (ids) => {
        try {
          for (const o of await ofertasAgrupadas(C, ids, `${DS[ds]} ${ids.length} ids`)) {
            const k = o.id_del_proceso_de_compra;
            if (!ofertasDe.has(k)) ofertasDe.set(k, []);
            ofertasDe.get(k).push({ ...o, _ds: DS[ds] }); n++;
          }
        } catch (e) {
          if (ids.length > 1) { const m = Math.ceil(ids.length / 2); await bajar(ids.slice(0, m)); await bajar(ids.slice(m)); return; }
          idsSinMedir.add(ids[0]);
          fallosOfertas.push({ ds: DS[ds], id: ids[0], status: e.status || null, error: e.detalle || e.message });
        }
      };
      await bajar(lote);
    }
    R.fuentes[ds] = { dataset: DS[ds], filas_cruzadas: n, corte: ahora() };
  }
  R.fallos_ofertas = fallosOfertas;
  fs.writeFileSync(path.join(salida, "ofertas_cruzadas.json"), JSON.stringify([...ofertasDe]));

  /* 5 · Embudo por proceso. */
  const cal = { grupos_oferta: 0, excl: {}, procesos_con_lote: 0, procesos_con_fuera_rango: 0, procesos_con_duplicadas: 0,
    procesos_con_cero_o_conf: 0, en_ambos_datasets: 0 };
  const embudo = {}; const porDepto = {};
  for (const p of procesos) {
    const e = embudo[p.mod] || (embudo[p.mod] = { total: 0, motivos: {}, real: 0, baja: 0 });
    e.total++;
    const f = p.fila; let motivo = null, comp = null;
    const base = L.numeroONull(f.precio_base);
    if (f.adjudicado !== "Si") motivo = "no_adjudicado:" + (f.estado_del_procedimiento || "sin estado");
    else if (base === null || base <= 0) motivo = "sin_precio_base";
    else if (p.lote_p6dx) motivo = "lote_p6dx";
    else if (idsSinMedir.has(p.portafolio)) motivo = "sin_medir_ofertas";
    else if (!ofertasDe.has(p.portafolio)) motivo = "sin_ofertas_en_datos_abiertos";
    else {
      const os = ofertasDe.get(p.portafolio);
      cal.grupos_oferta += os.length;
      if (new Set(os.map((o) => o._ds)).size > 1) cal.en_ambos_datasets++;
      const r = L.limpiarOfertas(os, base);
      for (const [k, v] of Object.entries(r.excluidas)) inc(cal.excl, k, v);
      if (r.excluidas.duplicada) cal.procesos_con_duplicadas++;
      if (r.excluidas.cero || r.excluidas.confidencial) cal.procesos_con_cero_o_conf++;
      if (r.excluidas.sobre_base || r.excluidas.bajo_50) cal.procesos_con_fuera_rango++;
      p.limpieza = { n_validas: r.validas.length, lote: r.lote_sospechoso };
      if (r.lote_sospechoso) { cal.procesos_con_lote++; motivo = "lote_por_ofertas"; }
      else if (!r.validas.length) motivo = "cero_ofertas_validas";
      else comp = L.competencia(r.validas.length);
    }
    if (motivo) inc(e.motivos, motivo.startsWith("no_adjudicado") ? "no_adjudicado" : motivo);
    if (motivo && motivo.startsWith("no_adjudicado")) inc(e.motivos_no_adj || (e.motivos_no_adj = {}), motivo.slice(14));
    if (comp) e[comp]++;
    p.comp = comp; p.motivo = motivo;
    if (p.mod !== "minima") {
      const d = f.departamento_entidad || "(sin dato)";
      const x = porDepto[d] || (porDepto[d] = { total: 0, adjudicados: 0, real: 0, baja: 0 });
      x.total++; if (f.adjudicado === "Si") x.adjudicados++; if (comp) x[comp]++;
    }
  }
  R.calidad = cal; R.embudo = embudo; R.por_departamento_entidad = porDepto;

  /* 6 · Lugar de ejecución (jbjy) para los usables. */
  const usables = procesos.filter((p) => p.comp);
  const C = cliente("contratos"); const lugar = new Map(); const fallosJ = [];
  for (const lote of trozos(usables.map((p) => p.portafolio), LOTE_IDS)) {
    try {
      const fil = await todas(C, enLista("proceso_de_compra", lote),
        "proceso_de_compra,departamento,ciudad,direcci_n_de_ejecuci_n_del_contrato,:id", "jbjy lote");
      for (const r of fil) if (!lugar.has(r.proceso_de_compra)) lugar.set(r.proceso_de_compra, r);
    } catch (e) { fallosJ.push({ ids: lote.length, status: e.status || null, error: e.detalle || e.message }); }
  }
  const ub = { usables: usables.length, con_contrato: 0, direccion_legible: 0,
    depto_direccion_distinto_de_entidad: 0, muni_direccion_distinto_de_entidad: 0,
    depto_jbjy_distinto_de_p6dx: 0, depto_sin_dato: 0, direccion_depto_sin_dato: 0, bogota_entidad: 0, bogota_direccion_fuera: 0, fallos: fallosJ };
  const nd = (s) => norm(s || "").trim();
  /* Igualdad EXACTA tras normalizar (un includes casaba Santander con Norte de Santander y el
     vacío con todo). Alias declarados solo para Bogotá; vacío o «No Definido» → null (sin dato). */
  const depto = (s) => { const x = nd(s).replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
    if (!x || x === "no definido") return null;
    return /^(bogota( d ?c)?|distrito capital( de bogota)?|bogota distrito capital)$/.test(x) ? "bogota" : x; };
  const mismoDepto = (a, b) => { const x = depto(a), y = depto(b); return x === null || y === null ? null : x === y; };
  for (const p of usables) {
    const j = lugar.get(p.portafolio); if (!j) continue;
    ub.con_contrato++;
    const mj = mismoDepto(j.departamento, p.fila.departamento_entidad);
    if (mj === null) ub.depto_sin_dato++; else if (!mj) ub.depto_jbjy_distinto_de_p6dx++;
    const lu = lugarDeDireccion(j.direcci_n_de_ejecuci_n_del_contrato);
    const esBog = /bogota/.test(nd(p.fila.departamento_entidad));
    if (esBog) ub.bogota_entidad++;
    if (!lu) continue;
    ub.direccion_legible++;
    const md = mismoDepto(lu.departamento, p.fila.departamento_entidad);
    if (md === null) { ub.direccion_depto_sin_dato++; continue; }
    if (!md) { ub.depto_direccion_distinto_de_entidad++; if (esBog) ub.bogota_direccion_fuera++; }
    if (nd(lu.municipio) !== nd(p.fila.ciudad_entidad)) ub.muni_direccion_distinto_de_entidad++;
  }
  R.ubicacion = ub;

  /* 7 · Tamaño de los datasets de ofertas por año (consulta por año; falla → sin medir). */
  R.tamano_ofertas = {};
  for (const [ds, anos] of [["ofertas", [2023, 2024, 2025, 2026]], ["ofertas_hist", [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]]]) {
    const Cx = cliente(ds); R.tamano_ofertas[DS[ds]] = {};
    for (const a of anos) R.tamano_ofertas[DS[ds]][a] = await medir(`${DS[ds]} ${a}`, async () => {
      const r = await Cx.pedir({ $select: "count(*) AS n", $where: `fecha_de_registro >= '${a}-01-01T00:00:00' AND fecha_de_registro < '${a + 1}-01-01T00:00:00'` }, `${DS[ds]} ${a}`);
      return L.numeroONull(r && r[0] && r[0].n);
    });
  }
  R.paa = await medir("9sue conteo", async () => { const r = await cliente("paa").pedir({ $select: "count(*) AS n" }, "9sue"); return L.numeroONull(r[0].n); });

  /* 8 · Reproducción de A, B, E con TODAS las ofertas válidas (los hábiles no se publican). */
  const casos = { A: { req: "CO1.REQ.11036237", piso_entidad_pct: 92.78 }, B: { req: "CO1.REQ.10970903", piso_entidad_pct: 92.33 },
    E: { req: "CO1.REQ.10710451", piso_entidad_pct: 91.61 } };
  R.validacion = {};
  for (const [c, v] of Object.entries(casos)) {
    const f0 = filas.find((f) => f.id_del_proceso === v.req);
    if (!f0) { R.validacion[c] = { ...v, encontrado: false }; continue; }
    const pf = f0.id_del_portafolio; const fs2 = filas.filter((f) => f.id_del_portafolio === pf); const base = L.numeroONull(L.elegirFila(fs2).precio_base);
    let os = ofertasDe.get(pf);
    if (!os || idsSinMedir.has(pf)) {
      try { os = (await ofertasAgrupadas(cliente("ofertas"), [pf], `oferta ${c}`)).map((o) => ({ ...o, _ds: DS.ofertas })); }
      catch (e) { R.validacion[c] = { ...v, portafolio: pf, sin_medir: true, status: e.status || null, error: e.detalle || e.message }; continue; }
    }
    const r = L.limpiarOfertas(os, base); const st = L.estadisticas(r.validas.map((o) => o.valor));
    const piso = (s) => (st.mediana !== null && s !== null ? st.mediana - s : null);
    R.validacion[c] = { ...v, portafolio: pf, filas_p6dx: fs2.length, precio_base: base, n_validas: st.n, excluidas: r.excluidas,
      lote: r.lote_sospechoso, mediana: st.mediana, sigma_pob: st.sigma_pob, sigma_muestral: st.sigma_muestral,
      piso_pob_pct: piso(st.sigma_pob) === null ? null : (100 * piso(st.sigma_pob)) / base,
      piso_muestral_pct: piso(st.sigma_muestral) === null ? null : (100 * piso(st.sigma_muestral)) / base };
  }
  R.fin = ahora();
  fs.writeFileSync(path.join(salida, "resumen.json"), JSON.stringify(R, null, 1));
  log(`listo: ${path.join(salida, "resumen.json")}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.detalle || e.message} (HTTP ${e.status || "—"})`); process.exit(1); });
module.exports = { lugarDeDireccion };

