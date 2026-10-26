"use strict";
/* Probabilidad de adjudicación · FASE 0: la puerta de datos (25-oct-2026). Solo MIDE.
   Uso:  node tools/analisis/adjudicacion/fase0.js <carpeta_de_la_base> <ficha_salida.json> [diccionario.json] [--sin-red]
   Lee lo que dejaron scripts/base_obra/inventario.js y base.js en la carpeta (p6dx_obra.json,
   ofertas_cruzadas.json, resumen.json, base.jsonl.gz, resumen_base.json; sueltos o .gz) y escribe:
     · <carpeta>/fase0_tablas.json: universo, cobertura por año (a)–(d), calidad y UNSPSC;
     · <ficha_salida.json>: la ficha de datos (fuentes, fechas de consulta, SHA-256 de cada archivo
       leído, definiciones, lo no verificado) que va al repositorio sin los datos.
   No reescribe ninguna regla: la fila por proceso, la limpieza de ofertas y la identidad del
   oferente son las de scripts/base_obra (llamadas); el tipo «Obra» es `obraDeclarada`
   (lib/filtros) y el segmento UNSPSC, `segmentoDe` (lib/indice_baja). Con red (por omisión) hace
   UNA consulta agregada a p6dx: cuántas filas con UNSPSC 72 o 95 NO son de tipo «Obra». Un
   conteo que falla es «sin medir», jamás 0. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const L = require("../../../scripts/base_obra/limpieza");
const { sinPrecio } = require("../../../scripts/base_obra/cifras");
const { obraDeclarada } = require("../../../lib/filtros");
const { segmentoDe } = require("../../../lib/indice_baja");

const ANOS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const MODS = ["licitacion", "menor_cuantia", "minima"];
const log = (m) => process.stderr.write(m + "\n");
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const ano = (s) => { const m = /^(\d{4})-/.exec(String(s || "")); return m ? m[1] : null; };
const pct = (a, b) => (b > 0 ? Math.round((1000 * a) / b) / 10 : null);

function archivo(dir, nombre) {
  for (const p of [path.join(dir, nombre), path.join(dir, nombre + ".gz")]) if (fs.existsSync(p)) return p;
  return null;
}
function leer(p) {
  const b = fs.readFileSync(p);
  return /\.gz$/.test(p) ? zlib.gunzipSync(b).toString("utf8") : b.toString("utf8");
}
function huella(p) {
  const b = fs.readFileSync(p);
  return { archivo: path.basename(p), bytes: b.length, sha256: crypto.createHash("sha256").update(b).digest("hex") };
}

/* Los segmentos que se cuentan como núcleo de obra civil y los que solo se marcan. 72 y 95 son
   construcción (edificación, instalaciones, mantenimiento; terrenos, estructuras y vías); 77
   (servicios ambientales) y 81 (ingeniería) están en SEGMENTOS_OBRA_PURA de lib/filtros para la
   pertinencia de la lista, pero en un contrato «Obra» indican objeto mixto: se marcan, no se excluyen. */
const NUCLEO = new Set(["72", "95"]);
const MARCADOS = new Set(["77", "81"]);
const claseSegmento = (s) => (s == null ? "sin_codigo" : NUCLEO.has(s) ? "nucleo_" + s : MARCADOS.has(s) ? "marcado_" + s : "otro");

function celdaVacia() {
  return { adjudicados: 0, a_valor_y_presupuesto: 0, a_consistente: 0, no_consultado: 0, con_ofertas_publicadas: 0, sin_ofertas_publicadas: 0,
    sin_medir_ofertas: 0, b_3_con_precio_bruto: 0, b_3_validas: 0, c_ganador_identificado: 0, c_ganador_emparejado: 0,
    d_todas_con_nit: 0, d_alguna_solo_nombre: 0, ofertas_validas_b: 0, ofertas_validas_b_con_nit: 0,
    usable_motor: 0, excluido_lote: 0, sin_competencia_de_precio: 0 };
}

async function sinObraConUnspscDeObra(desde) {
  const { crearCliente } = require("../../../lib/socrata");
  const P = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/p6dx-8zbt.json", log });
  const mods = ["Licitación pública", "Licitación pública Obra Publica", "Selección Abreviada de Menor Cuantía",
    "Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes"].map((m) => `'${m}'`).join(",");
  const where = `fecha_de_publicacion_del >= '${desde}T00:00:00' AND modalidad_de_contratacion in (${mods}) AND `
    + "(codigo_principal_de_categoria like 'V1.72%' OR codigo_principal_de_categoria like 'V1.95%')";
  try {
    const r = await P.pedir({ $select: "tipo_de_contrato,count(*) AS n", $where: where, $group: "tipo_de_contrato", $order: "n DESC", $limit: 200 }, "unspsc 72/95 por tipo");
    return { ok: true, filas_p6dx_por_tipo: r.map((x) => ({ tipo_de_contrato: x.tipo_de_contrato || null, filas: L.numeroONull(x.n) })),
      nota: "Son FILAS de p6dx (una por fase), no procesos; solo códigos con prefijo «V1.», así que no ve las filas «UNSPECIFIED» de un proceso que sí tiene código en otra fase. Sirve para ver qué deja fuera el filtro por tipo «Obra».",
      consultado_el: new Date().toISOString(), where };
  } catch (e) {
    return { ok: false, sin_medir: true, status: e.status || null, error: e.detalle || e.message, consultado_el: new Date().toISOString() };
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const conRed = !process.argv.includes("--sin-red");
  const [dir, fichaSalida, dicc] = args;
  if (!dir || !fichaSalida) { log("uso: node tools/analisis/adjudicacion/fase0.js <carpeta_de_la_base> <ficha_salida.json> [diccionario.json] [--sin-red]"); process.exit(2); }
  const rutas = {};
  for (const n of ["p6dx_obra.json", "ofertas_cruzadas.json", "resumen.json", "base.jsonl.gz", "resumen_base.json"]) {
    rutas[n] = archivo(dir, n.replace(/\.gz$/, "")) || archivo(dir, n);
    if (!rutas[n]) throw new Error(`falta ${n} en ${dir}`);
  }
  log("leyendo…");
  const filasP = JSON.parse(leer(rutas["p6dx_obra.json"]));
  const ofertasDe = new Map(JSON.parse(leer(rutas["ofertas_cruzadas.json"])));
  const resumen = JSON.parse(leer(rutas["resumen.json"]));
  const resumenBase = JSON.parse(leer(rutas["resumen_base.json"]));
  const base = leer(rutas["base.jsonl.gz"]).split("\n").filter(Boolean).map((l) => JSON.parse(l));

  /* Filas crudas por portafolio: año de publicación (la PRIMERA fase) y la fila elegida (UNSPSC). */
  const crudas = new Map(); let noObra = 0;
  for (const f of filasP) {
    if (!obraDeclarada(f)) noObra++;
    const k = f.id_del_portafolio; if (!k) continue;
    if (!crudas.has(k)) crudas.set(k, []);
    crudas.get(k).push(f);
  }

  const T = { generado: new Date().toISOString(), definiciones: {}, universo: {}, adjudicados: {}, calidad: {}, unspsc: {} };
  T.definiciones = {
    universo: "Procesos (id_del_portafolio de p6dx-8zbt, una fila elegida con limpieza.elegirFila) con tipo_de_contrato «Obra» (obraDeclarada) y modalidad licitación pública o selección abreviada de menor cuantía (limpieza.clasificarModalidad); mínima cuantía se cuenta aparte; concurso de méritos, contratación directa y régimen especial quedan fuera. La descarga toma las filas publicadas desde el 2020-01-01: un proceso cuya única fila es anterior queda fuera (borde de 2020).",
    ano_publicacion: "Año de la fecha_de_publicacion_del más antigua entre las filas del portafolio.",
    ano_adjudicacion: "Año de fecha_adjudicacion de la fila elegida. 2026 llega hasta el corte de la descarga.",
    a_valor_y_presupuesto: "Adjudicado con valor_total_adjudicacion > 0 y precio_base > 0.",
    a_consistente: "(a) y además valor adjudicado ≤ precio base (por encima es inconsistencia: dos casos medidos eran ×1000).",
    b_3_con_precio_bruto: "3 o más oferentes distintos (identidad unida de limpieza.proveedoresUnidos) con valor_de_la_oferta > 0, antes de cualquier rango.",
    b_3_validas: "3 o más ofertas VÁLIDAS (limpieza.limpiarOfertas: > 0, no «Confidencial», con oferente, sin duplicar, ≤ precio base y ≥ 50 % salvo el rescate) y el proceso no excluido (lotes, sin precio base…).",
    c_ganador_identificado: "Adjudicado con NIT válido o nombre del adjudicatario en p6dx.",
    c_ganador_emparejado: "Proceso no excluido (sin lotes, con precio base y ofertas) y la oferta del adjudicatario está entre las válidas, exactamente una (identidad unida NIT/nombre).",
    d_todas_con_nit: "Dentro de (b_3_validas): todas las ofertas válidas tienen un NIT válido en su identidad (clave «n:»).",
    d_alguna_solo_nombre: "Dentro de (b_3_validas): al menos una oferta válida se identifica solo por nombre o código de SECOP.",
    usable_motor: "(b_3_validas) y (c_ganador_emparejado), sin inconsistencia y con competencia de precio (no todas las válidas al mismo valor). Es la población de la Fase 1.",
    ofertas: "Una oferta es una combinación (proceso, oferente, valor) de wi7w-2nvm o b28v-edj8 pedida AGRUPADA en el servidor; las filas repetidas no son ofertas nuevas.",
  };
  T.control = { filas_p6dx: filasP.length, filas_que_no_son_obra: noObra, portafolios: crudas.size, filas_base: base.length };

  /* Universo por año de PUBLICACIÓN y modalidad. */
  const U = {};
  for (const m of MODS) { U[m] = {}; for (const a of [...ANOS, "sin_ano"]) U[m][a] = { procesos: 0, adjudicados: 0, no_adjudicados: 0 }; }
  /* Adjudicados por año de ADJUDICACIÓN. */
  const A = {};
  for (const m of MODS) { A[m] = {}; for (const a of [...ANOS, "otro_o_sin_fecha"]) A[m][a] = celdaVacia(); }
  const Q = {};   // calidad por año de adjudicación (licitación + menor cuantía)
  const S = {};   // UNSPSC
  const marcadoresGlobal = {};
  const huecoMensual = {};   // adjudicados consultados sin ninguna oferta publicada, por mes de adjudicación
  const unspscConflicto = { procesos_con_segmentos_distintos: 0, codigo_solo_en_otra_fila: 0 };
  for (const x of base) {
    const m = x.modalidad; if (!MODS.includes(m)) continue;
    const fs_ = crudas.get(x.portafolio) || [];
    const aPub = fs_.map((f) => ano(f.fecha_de_publicacion_del)).filter(Boolean).sort()[0] || null;
    const u = U[m][ANOS.includes(aPub) ? aPub : "sin_ano"];
    u.procesos++; if (x.adjudicado) u.adjudicados++; else u.no_adjudicados++;
    /* UNSPSC: el de la fila elegida y, si no trae, el de otra fila del MISMO portafolio. Medido el
       25-oct-2026: desde 2023 la fila «Presentación de oferta» de menor cuantía trae el literal
       «UNSPECIFIED» (9.915 procesos) y en 9.343 de ellos otra fase sí trae el código. */
    const elegida = fs_.length ? L.elegirFila(fs_) : null;
    const segs = [...new Set(fs_.map((f) => segmentoDe(f)).filter(Boolean))];
    if (segs.length > 1) unspscConflicto.procesos_con_segmentos_distintos++;
    let seg = elegida ? segmentoDe(elegida) : null;
    if (!seg && segs.length) { seg = fs_.slice().sort((p, q) => String(p.fecha_de_publicacion_del || "").localeCompare(String(q.fecha_de_publicacion_del || ""))).map((f) => segmentoDe(f)).find(Boolean); unspscConflicto.codigo_solo_en_otra_fila++; }
    const cs = claseSegmento(seg);
    if (cs === "otro") inc(unspscConflicto.otros_segmentos || (unspscConflicto.otros_segmentos = {}), seg);
    const s = S[m] || (S[m] = {});
    const sx = s[cs] || (s[cs] = { procesos: 0, adjudicados: 0, usable_motor: 0 });
    sx.procesos++; if (x.adjudicado) sx.adjudicados++;
    if (!x.adjudicado) continue;
    const aAdj = ano(x.fecha_adjudicacion);
    const c = A[m][ANOS.includes(aAdj) ? aAdj : "otro_o_sin_fecha"];
    c.adjudicados++;
    const aVal = x.valor_adjudicado != null && x.precio_base > 0;
    if (aVal) c.a_valor_y_presupuesto++;
    /* (a) es «lo adjudicado no pasa del precio base», y nada más: `inconsistencia` también marca un
       adjudicado a más del 1 % de la oferta del ganador, que es otra cosa y bajaba (a) entre 2 y 17 puntos
       (lo cazó el verificador independiente, 25-oct-2026). `pct_adjudicado` solo existe con p ≤ 1. */
    if (aVal && x.pct_adjudicado != null) c.a_consistente++;
    const os = ofertasDe.get(x.portafolio);
    /* inventario.js solo pide ofertas de adjudicados con precio base y sin varios precios base: los
       demás NO se consultaron, y contarlos como «sin ofertas» sería un cero donde hay un «no sé». */
    if (x.excluido === "sin_precio_base" || x.excluido === "lote_p6dx") c.no_consultado++;
    else if (x.excluido === "sin_medir_ofertas") c.sin_medir_ofertas++;
    else if (os && os.length) c.con_ofertas_publicadas++;
    else { c.sin_ofertas_publicadas++; inc(huecoMensual, `${(x.fecha_adjudicacion || "sin fecha").slice(0, 7)}|${m}`); }
    if (/^lote/.test(x.excluido || "")) c.excluido_lote++;
    if (os && os.length) {
      const prov = L.proveedoresUnidos(os); const conValor = new Set();
      for (const o of os) { const v = L.numeroONull(o.valor_de_la_oferta); const p = prov(o); if (v !== null && v > 0 && p) conValor.add(p); }
      if (conValor.size >= 3) c.b_3_con_precio_bruto++;
      // marcadores sobre las ofertas agrupadas (no filas): por año y modalidad
      const q = Q[aAdj || "sin_fecha"] || (Q[aAdj || "sin_fecha"] = {});
      const qm = q[m] || (q[m] = { grupos_de_la_consulta: 0, valor_nulo_o_no_numerico: 0, valor_cero: 0, valor_negativo: 0, valor_uno: 0,
        valor_solo_nueves: 0, valor_billon_o_mas: 0, confidencial: 0, sobre_precio_base: 0, bajo_50_del_precio_base: 0, entre_50_y_80: 0, procesos_con_ofertas: 0, en_ambos_datasets: 0 });
      qm.procesos_con_ofertas++;
      if (new Set(os.map((o) => o._ds)).size > 1) qm.en_ambos_datasets++;
      for (const o of os) {
        qm.grupos_de_la_consulta++;
        if (/confidencial/i.test(String(o.nombre_proveedor || ""))) { qm.confidencial++; continue; }
        const v = L.numeroONull(o.valor_de_la_oferta);
        if (v === null) { qm.valor_nulo_o_no_numerico++; continue; }
        if (v === 0) qm.valor_cero++; else if (v < 0) qm.valor_negativo++; else if (v === 1) qm.valor_uno++;
        if (/^9{9,}$/.test(String(Math.trunc(Math.abs(v))))) qm.valor_solo_nueves++;   // 999999999, 9999999999…: marcador
        if (v >= 1e12) qm.valor_billon_o_mas++;
        if (v > 0 && x.precio_base > 0) { const r = v / x.precio_base; if (r > 1) qm.sobre_precio_base++; else if (r < 0.5) qm.bajo_50_del_precio_base++; else if (r < 0.8) qm.entre_50_y_80++; }
      }
      // exclusiones de limpiarOfertas tal como quedaron en la base
      if (x.excluidas) for (const [k, v] of Object.entries(x.excluidas)) inc(marcadoresGlobal, `${m}|${k}`, v);
    }
    if (x.ganador_id) c.c_ganador_identificado++;
    if (x.oferta_ganadora && !x.excluido) c.c_ganador_emparejado++;   // con lotes las ofertas no son comparables
    const b = !x.excluido && x.n_validas >= 3;
    if (b) {
      c.b_3_validas++;
      const conNit = x.ofertas_validas.filter((o) => String(o.proveedor || "").startsWith("n:")).length;
      c.ofertas_validas_b += x.ofertas_validas.length; c.ofertas_validas_b_con_nit += conNit;
      if (conNit === x.ofertas_validas.length) c.d_todas_con_nit++; else c.d_alguna_solo_nombre++;
      if (sinPrecio(x)) c.sin_competencia_de_precio++;
      else if (x.oferta_ganadora && !x.inconsistencia) { c.usable_motor++; sx.usable_motor++; }
    }
  }
  // porcentajes sobre los adjudicados de cada celda
  for (const m of MODS) for (const a of Object.keys(A[m])) {
    const c = A[m][a];
    c.pct = { a_consistente: pct(c.a_consistente, c.adjudicados), con_ofertas_publicadas: pct(c.con_ofertas_publicadas, c.adjudicados),
      b_3_validas: pct(c.b_3_validas, c.adjudicados), c_ganador_emparejado: pct(c.c_ganador_emparejado, c.adjudicados),
      d_todas_con_nit_sobre_b: pct(c.d_todas_con_nit, c.b_3_validas), ofertas_con_nit_sobre_b: pct(c.ofertas_validas_b_con_nit, c.ofertas_validas_b),
      usable_motor: pct(c.usable_motor, c.adjudicados) };
  }
  T.universo = U; T.adjudicados = A; T.calidad = { por_ano_adjudicacion: Q, exclusiones_limpieza: marcadoresGlobal,
    nota: "Conteos de GRUPOS de la consulta agrupada (proceso, NIT, código, nombre, valor), no de ofertas ni de filas crudas: una oferta puede ser varios grupos porque c_digo_proveedor cambia dentro de una misma oferta (auditor, 25-oct-2026: 1.039.658 grupos para 215.375 combinaciones oferente-valor). Las ofertas distintas son las de limpiarOfertas (exclusiones_limpieza). Solo procesos adjudicados del universo; la moneda no viene en la consulta agrupada (el diccionario la cuenta por filas).",
    fallos_ofertas: (resumen.fallos_ofertas || []).length };
  T.calidad.sin_ofertas_por_mes = Object.fromEntries(Object.entries(huecoMensual).sort());
  T.unspsc = { por_modalidad: S, nucleo: [...NUCLEO], marcados: [...MARCADOS], lectura: unspscConflicto,
    con_red: conRed ? await sinObraConUnspscDeObra(resumen.desde || "2020-01-01") : { sin_medir: true, motivo: "--sin-red" } };
  T.embudo_base = resumenBase.embudo || resumenBase;

  fs.writeFileSync(path.join(dir, "fase0_tablas.json"), JSON.stringify(T, null, 1));

  /* La ficha: lo que va al repositorio (sin datos). */
  const diccionario = dicc && fs.existsSync(dicc) ? JSON.parse(fs.readFileSync(dicc, "utf8")) : null;
  const ficha = {
    generado: T.generado,
    para: "Fase 0 del estudio de probabilidad de adjudicación (docs/ADJUDICACION_FASE0_2026-10-25.md). Los datos NO van al repositorio: se reproducen con los comandos y se comprueban con el SHA-256.",
    comandos: [
      `node scripts/base_obra/inventario.js <carpeta> ${resumen.desde || "2020-01-01"}`,
      "node scripts/base_obra/base.js <carpeta>",
      "node tools/analisis/adjudicacion/diccionario.js <carpeta>/diccionario.json",
      "node tools/analisis/adjudicacion/fase0.js <carpeta> tools/analisis/fase0_ficha_datos.json <carpeta>/diccionario.json",
    ],
    descarga: { desde: resumen.desde || null, inicio: resumen.inicio || null, fin: resumen.fin || null, fuentes: resumen.fuentes || null,
      fallos_ofertas: (resumen.fallos_ofertas || []).length },
    archivos: [...Object.values(rutas), path.join(dir, "fase0_tablas.json"), ...(diccionario ? [dicc] : [])].map(huella),
    definiciones: T.definiciones,
    control: T.control,
    diccionario: diccionario || { sin_medir: true, motivo: "no se pasó diccionario.json" },
    cobertura_por_ano: Object.fromEntries(MODS.map((m) => [m, Object.fromEntries(Object.entries(A[m]).map(([a, c]) => [a, {
      adjudicados: c.adjudicados, a: c.a_consistente, b: c.b_3_validas, c: c.c_ganador_emparejado, d_todas_con_nit: c.d_todas_con_nit, usable_motor: c.usable_motor }]))])),
    no_verificado: [
      "Si valor_de_la_oferta es el precio que la entidad evaluó: se contrasta con lo adjudicado (inconsistencia > 1 %), no con el informe de evaluación.",
      "Qué ofertas quedaron HABILITADAS: ninguna columna de wi7w-2nvm ni b28v-edj8 lo dice (metadatos del 25-oct-2026).",
      "La moneda de cada oferta agrupada: la consulta agrupada no la trae; el diccionario la cuenta por filas.",
      "Procesos con una sola fila anterior al 2020-01-01 (borde de 2020) y procesos adjudicados después del corte (2026 parcial).",
      "El mismo identificador_de_la_oferta con dos valores: la consulta agrupada no lleva el identificador; no se midió aquí.",
      "jbjy-vk9h (contratos) respondía count(*) = 1000 el 25-oct-2026 (medido dos veces, HTTP 200): la corrida halló contrato en 3 de los usables. Eso apaga el rescate bajo el 50 % (0 rescates; el 17-oct fueron 12, todos de mínima) y el lugar de ejecución, y SÍ puede mover (b) y (c): el auditor midió un techo de 52 procesos (46 de mínima). Volver a correr base.js cuando jbjy se recupere.",
    ],
    jbjy_al_correr: { usables: (resumen.ubicacion || {}).usables ?? null, con_contrato: (resumen.ubicacion || {}).con_contrato ?? null },
  };
  fs.writeFileSync(fichaSalida, JSON.stringify(ficha, null, 1) + "\n");
  log(`listo: ${path.join(dir, "fase0_tablas.json")} y ${fichaSalida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
module.exports = { claseSegmento, NUCLEO, MARCADOS };
