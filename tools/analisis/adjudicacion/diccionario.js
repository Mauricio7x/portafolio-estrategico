"use strict";
/* Probabilidad de adjudicación · FASE 0: el diccionario MEDIDO de los datasets (25-oct-2026). Solo LEE.
   Uso:  node tools/analisis/adjudicacion/diccionario.js <archivo_salida.json>
   Para cada dataset de SECOP II en datos.gov.co: metadatos (/api/views: nombre, descripción,
   `rowsUpdatedAt`, vista madre, columnas y tipos), filas totales, filas por año de su fecha
   natural y, en las dos bases de ofertas, los valores marcador por año. Además prueba cada llave de
   cruce con una muestra real. Todo es AGREGADO en el servidor (SoQL): no baja datasets.
   Transporte: lib/socrata.crearCliente; el JSON de /api/views se parsea APARTE del fetch (un muro
   puede responder HTML). Una medición que falla queda { sin_medir, status, error }, jamás 0. */
const fs = require("fs");
const { crearCliente, escSoQL } = require("../../../lib/socrata");

const RAIZ = "https://www.datos.gov.co";
const PLAZO_MS = 120000;
const log = (m) => process.stderr.write(m + "\n");
const ahora = () => new Date().toISOString();
const numero = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/* id → columna de fecha natural (para la cobertura por año) */
const DATASETS = {
  "p6dx-8zbt": { fecha: "fecha_de_publicacion_del", papel: "procesos (una fila por fase)" },
  "jbjy-vk9h": { fecha: "fecha_de_firma", papel: "contratos" },
  "hgi6-6wh3": { fecha: "fecha_publicaci_n", papel: "proponentes por proceso" },
  "wi7w-2nvm": { fecha: "fecha_de_registro", papel: "ofertas desde 2024 (filas repetidas por oferta)" },
  "b28v-edj8": { fecha: "fecha_de_registro", papel: "ofertas hasta 2023 (filas repetidas por oferta)" },
  "atkq-fc9r": { fecha: "fecha_de_registro", papel: "vista «Ofertas 2020» (filtro de wi7w)" },
  "pp6p-gvye": { fecha: "fecha_de_registro", papel: "vista «Ofertas 2021» (filtro de wi7w)" },
  "yk6j-79e6": { fecha: "fecha_de_registro", papel: "vista «Ofertas 2022» (filtro de wi7w)" },
  "vz4x-85r3": { fecha: "fecha_de_registro", papel: "vista «Ofertas 2023» (filtro de wi7w)" },
  "qmzu-gj57": { fecha: "fecha_creacion", papel: "proveedores registrados" },
  "32sa-8pi3": { fecha: "vigenciadesde", papel: "TRM (serie histórica)" },
};
const cliente = (id) => crearCliente({ baseUrl: `${RAIZ}/resource/${id}.json`, log });

async function medir(etiqueta, fn) {
  const t0 = Date.now();
  try { const valor = await fn(); return { ok: true, valor, ms: Date.now() - t0, consultado_el: ahora() }; }
  catch (e) { log(`SIN MEDIR ${etiqueta}: ${e.detalle || e.message}`);
    return { ok: false, sin_medir: true, status: e.status || null, error: String(e.detalle || e.message).slice(0, 500), ms: Date.now() - t0, consultado_el: ahora() }; }
}

async function metadatos(id) {
  const r = await fetch(`${RAIZ}/api/views/${id}.json`, { signal: AbortSignal.timeout(60000) });
  const texto = await r.text();
  if (!r.ok) { const e = new Error(`HTTP ${r.status}: ${texto.slice(0, 200)}`); e.status = r.status; throw e; }
  let d; try { d = JSON.parse(texto); } catch { const e = new Error(`respuesta no JSON: ${texto.slice(0, 200)}`); e.status = r.status; throw e; }
  const iso = (s) => (Number.isFinite(s) ? new Date(s * 1000).toISOString() : null);
  return { nombre: d.name || null, descripcion: String(d.description || "").slice(0, 300), vista_madre: d.modifyingViewUid || null,
    filas_actualizadas_el: iso(d.rowsUpdatedAt), creado_el: iso(d.createdAt),
    columnas: (d.columns || []).filter((c) => !String(c.fieldName).startsWith(":")).map((c) => ({ campo: c.fieldName, tipo: c.dataTypeName, nombre: c.name })) };
}

const porAno = (cli, col, where, etiqueta) => cli.pedir({ $select: `date_extract_y(${col}) AS a, count(*) AS n`, ...(where ? { $where: where } : {}),
  $group: "a", $order: "a", $limit: 200 }, etiqueta, { plazoMs: PLAZO_MS }).then((r) => Object.fromEntries(r.map((x) => [x.a == null ? "sin_fecha" : String(x.a), numero(x.n)])));

async function main() {
  const salida = process.argv[2];
  if (!salida) { log("uso: node tools/analisis/adjudicacion/diccionario.js <archivo_salida.json>"); process.exit(2); }
  const R = { inicio: ahora(), raiz: RAIZ, datasets: {}, llaves: {}, notas: [
    "Conteos de FILAS. En wi7w-2nvm y b28v-edj8 cada oferta se repite en muchas filas (una oferta es su identificador_de_la_oferta): un conteo de filas no es un conteo de ofertas.",
  ] };
  for (const [id, cfg] of Object.entries(DATASETS)) {
    log(`· ${id}`);
    const C = cliente(id);
    const D = { url_datos: `${RAIZ}/resource/${id}.json`, url_metadatos: `${RAIZ}/api/views/${id}.json`, papel: cfg.papel, columna_fecha: cfg.fecha };
    D.metadatos = await medir(`${id} metadatos`, () => metadatos(id));
    D.filas = await medir(`${id} filas`, async () => numero((await C.pedir({ $select: "count(*) AS n" }, `${id} filas`, { plazoMs: PLAZO_MS }))[0].n));
    D.filas_por_ano = await medir(`${id} por año`, () => porAno(C, cfg.fecha, null, `${id} por año`));
    D.filas_sin_fecha = await medir(`${id} sin fecha`, async () => numero((await C.pedir({ $select: "count(*) AS n", $where: `${cfg.fecha} IS NULL` }, `${id} sin fecha`, { plazoMs: PLAZO_MS }))[0].n));
    if (id === "p6dx-8zbt") {
      D.obra_por_ano = await medir("p6dx obra por año", () => porAno(C, cfg.fecha, "tipo_de_contrato='Obra'", "p6dx obra por año"));
      D.obra_por_ano_y_modalidad = await medir("p6dx obra × modalidad", async () => (await C.pedir({
        $select: `date_extract_y(${cfg.fecha}) AS a, modalidad_de_contratacion AS m, count(*) AS n`, $where: "tipo_de_contrato='Obra'",
        $group: "a,m", $order: "a,n DESC", $limit: 2000 }, "p6dx obra × modalidad", { plazoMs: PLAZO_MS })).map((x) => ({ ano: x.a, modalidad: x.m || null, filas: numero(x.n) })));
    }
    if (id === "wi7w-2nvm" || id === "b28v-edj8") {
      const conds = {
        valor_nulo: "valor_de_la_oferta IS NULL", valor_cero: "valor_de_la_oferta = 0", valor_negativo: "valor_de_la_oferta < 0",
        valor_uno: "valor_de_la_oferta = 1", valor_999999999: "valor_de_la_oferta = 999999999", valor_billon_o_mas: "valor_de_la_oferta >= 1000000000000",
        moneda_no_cop: "moneda IS NULL OR moneda != 'COP'",
        confidencial: "nombre_proveedor = 'Confidencial' OR identificador_de_la_oferta = 'Confidencial'",
        nit_no_definido: "nit_del_proveedor = 'No Definido'",
      };
      D.marcadores_por_ano = {};
      for (const [k, w] of Object.entries(conds)) D.marcadores_por_ano[k] = await medir(`${id} ${k}`, () => porAno(C, cfg.fecha, w, `${id} ${k}`));
      D.monedas = await medir(`${id} monedas`, async () => (await C.pedir({ $select: "moneda, count(*) AS n", $group: "moneda", $order: "n DESC", $limit: 50 }, `${id} monedas`, { plazoMs: PLAZO_MS })).map((x) => ({ moneda: x.moneda ?? null, filas: numero(x.n) })));
    }
    R.datasets[id] = D;
  }

  /* Llaves de cruce, cada una con UNA muestra real. */
  const P = cliente("p6dx-8zbt");
  const enP = async (col, v) => numero((await P.pedir({ $select: "count(*) AS n", $where: `${col}='${escSoQL(v)}'` }, `p6dx ${col}`, { plazoMs: PLAZO_MS }))[0].n);
  const muestra = async (id, select, where) => (await cliente(id).pedir({ $select: select, ...(where ? { $where: where } : {}), $limit: 1 }, `${id} muestra`, { plazoMs: PLAZO_MS }))[0] || null;
  R.llaves.wi7w_a_p6dx = await medir("llave wi7w", async () => { const m = await muestra("wi7w-2nvm", "id_del_proceso_de_compra", "fecha_de_registro >= '2025-06-01T00:00:00'");
    const v = m && m.id_del_proceso_de_compra; return { ejemplo: v, filas_p6dx_por_id_del_portafolio: await enP("id_del_portafolio", v), filas_p6dx_por_id_del_proceso: await enP("id_del_proceso", v) }; });
  R.llaves.b28v_a_p6dx = await medir("llave b28v", async () => { const m = await muestra("b28v-edj8", "id_del_proceso_de_compra", "fecha_de_registro >= '2022-06-01T00:00:00'");
    const v = m && m.id_del_proceso_de_compra; return { ejemplo: v, filas_p6dx_por_id_del_portafolio: await enP("id_del_portafolio", v), filas_p6dx_por_id_del_proceso: await enP("id_del_proceso", v) }; });
  R.llaves.jbjy_a_p6dx = await medir("llave jbjy", async () => { const m = await muestra("jbjy-vk9h", "proceso_de_compra", "fecha_de_firma >= '2025-06-01T00:00:00' AND tipo_de_contrato='Obra'");
    const v = m && m.proceso_de_compra; return { ejemplo: v, filas_p6dx_por_id_del_portafolio: await enP("id_del_portafolio", v), filas_p6dx_por_id_del_proceso: await enP("id_del_proceso", v) }; });
  R.llaves.hgi6_a_p6dx = await medir("llave hgi6", async () => { const m = await muestra("hgi6-6wh3", "id_procedimiento", "fecha_publicaci_n >= '2025-06-01T00:00:00'");
    const v = m && m.id_procedimiento; return { ejemplo: v, filas_p6dx_por_id_del_portafolio: await enP("id_del_portafolio", v), filas_p6dx_por_id_del_proceso: await enP("id_del_proceso", v) }; });
  R.llaves.qmzu_a_wi7w = await medir("llave qmzu", async () => { const m = await muestra("wi7w-2nvm", "c_digo_proveedor,nit_del_proveedor", "fecha_de_registro >= '2025-06-01T00:00:00' AND nit_del_proveedor != 'No Definido' AND nombre_proveedor != 'Confidencial'");
    const Q = cliente("qmzu-gj57"); const cuenta = async (col, v) => (v ? numero((await Q.pedir({ $select: "count(*) AS n", $where: `${col}='${escSoQL(v)}'` }, `qmzu ${col}`, { plazoMs: PLAZO_MS }))[0].n) : null);
    return { ejemplo: m, filas_qmzu_por_codigo: await cuenta("codigo", m && m.c_digo_proveedor), filas_qmzu_por_nit: await cuenta("nit", m && m.nit_del_proveedor) }; });
  R.marca_de_habilitacion = { columnas_wi7w: (R.datasets["wi7w-2nvm"].metadatos.valor || {}).columnas?.map((c) => c.campo) || null,
    conclusion: "Ninguna columna de wi7w-2nvm ni de b28v-edj8 dice si la oferta quedó habilitada, rechazada o ganadora: el ganador sale de p6dx (nombre_del_proveedor, nit_del_proveedor_adjudicado, valor_total_adjudicacion) y de jbjy." };
  R.fin = ahora();
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  log(`listo: ${salida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
