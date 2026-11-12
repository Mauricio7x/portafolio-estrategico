"use strict";
/* ============================================================================
   lib/grupo_ofertas · ¿Dónde habría quedado su precio frente a TODAS las ofertas de los procesos anteriores de la entidad?
   ----------------------------------------------------------------------------
   PLAN_X20, tanda 8, D4 (11-nov-2026). El aviso que faltó en Cali (4151.010.32.1.1255-2026): la oferta
   propia al 96,75 % del presupuesto quedó por encima de las cuatro hábiles (93,30 % a 95,56 %) y la
   pantalla de Precios decía «en rango». El pasado de la entidad sí lo decía: en 21 procesos anteriores
   con tres o más ofertas, un 96,75 % habría quedado por encima de todas en 8 (docs/PLAN_X20.md § 2.1).

   Es un HECHO CONTADO, no una probabilidad ni un precio sugerido (la regla del 28-oct-2026 sigue: el
   precio, solo, apenas predice quién gana). Dice en cuántos de los procesos anteriores de esta entidad,
   en esta modalidad y con tres o más ofertas, un precio como el suyo (en % del presupuesto) habría
   quedado por encima de TODAS las ofertas y por encima de la MITAD. Con menos de MIN_PROCESOS no se
   dice nada.

   Datos: p6dx-8zbt (procesos adjudicados de obra de la entidad, con su presupuesto) y wi7w-2nvm (las
   ofertas, por expediente). Las mismas dos trampas que esquiva la medición del plan: una fila
   «Confidencial» con valor 0 no es una oferta, y un proponente con dos valores (lotes u oferta
   corregida) saca el proceso de la cuenta. Ofertas por encima del 100 % o por debajo del 70 % del
   presupuesto también lo sacan: o el presupuesto publicado no es el del pliego, o es otro lote.
   Las ofertas son de TODOS los que se presentaron, no solo de los hábiles: los datos abiertos no dicen
   quién quedó hábil.
   El precio que se compara es el TOTAL que se escribe en SECOP II (`oferta.total_para_secop`, con el IVA de la
   utilidad cuando la entidad lo lleva o no se sabe): es con lo que compiten las ofertas publicadas. La primera
   versión comparaba el precio sin IVA y la revisión adversaria midió que eso bajaba el caso de Cali 0,75 puntos y
   apagaba la alerta justo en la zona que decide.
   ============================================================================ */

const MIN_PROCESOS = 5;
const MIN_OFERTAS = 3;
const MAX_PROCESOS = 30;
/* wi7w agrupa despacio: 10 expedientes tardaron 5,8 s el 11-nov-2026 (medido con curl). Se piden en tandas de
   TANDA en paralelo, cada una con su plazo, y nunca dentro del cálculo de Precios: va en su propia acción. */
const TANDA = 10;
const TTL_SEG = 24 * 3600;
const RANGO_PCT = [70, 100.0001];
const TIEMPO_MS = 25000;   // por tanda de diez expedientes; la acción entera tiene 60 s (vercel.json, api/apu.js)
const BASES = {
  adjudicaciones: () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json",
  ofertas: () => process.env.OFERTAS_BASE_URL || "https://www.datos.gov.co/resource/wi7w-2nvm.json",
};
// v2 (12-nov-2026): la memoria guarda también los adjudicados con su número de ofertas (la referencia por competencia)
const clave = (nit, modalidad) => `grupo_ofertas:v2:${nit}:${modalidad}`;
const num = (v) => { if (v == null || v === "") return null; const n = Number(String(v).trim()); return Number.isFinite(n) ? n : null; };
const normNombre = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
const mediana = (v) => { const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };

/* Las filas agrupadas de wi7w (id, nombre, valor) y los procesos de p6dx (id → presupuesto) → los
   procesos comparables: [{id, ofertas_pct: [...]}], una oferta por proponente, en % del presupuesto. */
function procesosComparables(presupuestos, filasOfertas) {
  const porId = new Map();
  for (const f of filasOfertas || []) {
    const id = String(f.id_del_proceso_de_compra || "").trim();
    const nombre = normNombre(f.nombre_proveedor);
    const v = num(f.valor_de_la_oferta);
    if (!id || !nombre || nombre === "CONFIDENCIAL" || !(v > 0)) continue;
    if (!porId.has(id)) porId.set(id, new Map());
    const m = porId.get(id);
    if (!m.has(nombre)) m.set(nombre, new Set());
    m.get(nombre).add(Math.round(v));
  }
  const out = [];
  for (const [id, m] of porId) {
    const pb = presupuestos.get(id);
    if (!(pb > 0)) continue;
    if ([...m.values()].some((s) => s.size > 1)) continue;          // lotes u oferta corregida
    const pcts = [...m.values()].map((s) => ([...s][0] * 100) / pb);
    if (pcts.length < MIN_OFERTAS) continue;
    if (pcts.some((p) => p < RANGO_PCT[0] || p > RANGO_PCT[1])) continue;
    out.push({ id, ofertas_pct: pcts.sort((a, b) => a - b) });
  }
  return out;
}

/* EL HECHO para un precio (en % del presupuesto de SU proceso). null sin precio legible. */
function precioFrenteAlGrupo(procesos, pct) {
  const p = num(pct);
  if (p == null || !(p > 0) || !Array.isArray(procesos)) return null;
  const validos = procesos.filter((x) => x && Array.isArray(x.ofertas_pct) && x.ofertas_pct.length >= MIN_OFERTAS);
  const n = validos.length;
  const todas = validos.filter((x) => p > Math.max(...x.ofertas_pct)).length;
  const mitad = validos.filter((x) => p > mediana(x.ofertas_pct)).length;
  const pctTxt = require("./lenguaje_pantalla.js").numCO(Math.round(p * 100) / 100, 2);
  return {
    procesos_contados: n, min_procesos: MIN_PROCESOS, precio_pct: p,
    por_encima_de_todas: n >= MIN_PROCESOS ? todas : null,
    por_encima_de_la_mitad: n >= MIN_PROCESOS ? mitad : null,
    frase: n < MIN_PROCESOS ? null
      : `En ${todas} de los ${n} procesos anteriores de esta entidad con tres o más ofertas, un precio del ${pctTxt} % del presupuesto habría quedado por encima de todas las ofertas, y en ${mitad}, por encima de la mitad.`,
    /* la alerta: el precio habría quedado por encima de la MITAD de las ofertas en más de la mitad de los procesos
       (en Cali, 13 de 24 con 96,75 %). No decide nada: solo pinta la frase en ámbar. */
    alerta: n >= MIN_PROCESOS && mitad * 2 > n,
  };
}

/* Las ofertas de los procesos anteriores de la entidad: de Redis si están (24 h), si no de datos.gov.co.
   Devuelve {ok, procesos, motivo}. Una fuente que no responde es ok:false con su motivo, jamás una lista
   vacía: «no hay procesos» y «no se pudo consultar» son cosas distintas. `literalModalidad` es el texto
   de SECOP II («Selección Abreviada de Menor Cuantía»): sin él no se consulta (mezclar modalidades
   mezclaría grupos que se forman distinto). */
async function leerGrupo(redis, { nit, literalModalidad, log = () => {}, cliente = null } = {}) {
  const nitL = String(nit || "").replace(/\D/g, "");
  const mod = String(literalModalidad || "").trim();
  if (nitL.length < 6) return { ok: false, procesos: null, motivo: "sin_nit" };
  if (!mod) return { ok: false, procesos: null, motivo: "sin_modalidad" };
  const k = clave(nitL, mod.toLowerCase().replace(/[^a-z]+/g, "_").slice(0, 40));
  if (redis) {
    try { const v = await redis.get(k); if (v) { const j = JSON.parse(v); if (j && Array.isArray(j.procesos)) return { ok: true, procesos: j.procesos, adjudicados: Array.isArray(j.adjudicados) ? j.adjudicados : null, desde: "memoria" }; } } catch (e) { log(`grupo_ofertas: ${e && e.message}`); }
  }
  const { crearCliente, escSoQL } = require("./socrata.js");
  const cli = (b) => (cliente ? cliente(b) : crearCliente({ baseUrl: b, log }));
  const conTiempo = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`tiempo agotado (${TIEMPO_MS} ms)`)), TIEMPO_MS))]);
  let filasP;
  try {
    filasP = await conTiempo(cli(BASES.adjudicaciones()).pedir({
      "$select": "id_del_portafolio,precio_base,respuestas_al_procedimiento,valor_total_adjudicacion",
      "$where": `nit_entidad='${escSoQL(nitL)}' and modalidad_de_contratacion='${escSoQL(mod)}' and adjudicado='Si' and tipo_de_contrato='Obra'`,
      "$order": "fecha_de_recepcion_de DESC", "$limit": "200",
    }, "procesos anteriores de la entidad", { plazoMs: TIEMPO_MS }));
  } catch (e) { log(`grupo_ofertas/p6dx: ${e && e.message}`); return { ok: false, procesos: null, motivo: "no_respondio" }; }
  const presupuestos = new Map();
  /* los ADJUDICADOS de la entidad con cuántas ofertas llegaron: [pct del presupuesto, ofertas], uno por expediente
     (la fila con más respuestas), fuera los que caen fuera del 70-100 % (otro presupuesto u otro lote) */
  const adj = new Map();
  for (const f of Array.isArray(filasP) ? filasP : []) {
    const id = String(f.id_del_portafolio || "").trim(), pb = num(f.precio_base), r = num(f.respuestas_al_procedimiento), va = num(f.valor_total_adjudicacion);
    if (id && pb > 0 && r >= 1 && va > 0) {
      const pct = (va * 100) / pb;
      if (pct >= RANGO_PCT[0] && pct <= RANGO_PCT[1] && (!adj.has(id) || adj.get(id)[1] < r)) adj.set(id, [Math.round(pct * 1e4) / 1e4, Math.round(r)]);
    }
    if (!id || !(pb > 0) || !(r >= MIN_OFERTAS)) continue;
    if (!presupuestos.has(id) && presupuestos.size < MAX_PROCESOS) presupuestos.set(id, pb);
  }
  const adjudicados = [...adj.values()];
  let procesos = [];
  if (presupuestos.size) {
    const ids = [...presupuestos.keys()], tandas = [];
    for (let i = 0; i < ids.length; i += TANDA) tandas.push(ids.slice(i, i + TANDA));
    let resultados;
    try {
      resultados = await Promise.all(tandas.map((t) => conTiempo(cli(BASES.ofertas()).pedir({
        "$select": "id_del_proceso_de_compra,nombre_proveedor,valor_de_la_oferta,count(*) as filas",
        "$where": `id_del_proceso_de_compra in (${t.map((x) => `'${escSoQL(x)}'`).join(",")})`,
        "$group": "id_del_proceso_de_compra,nombre_proveedor,valor_de_la_oferta", "$limit": "5000",
      }, "ofertas de los procesos anteriores", { plazoMs: TIEMPO_MS }))));
    } catch (e) { log(`grupo_ofertas/wi7w: ${e && e.message}`); return { ok: false, procesos: null, motivo: "no_respondio" }; }
    // en el tope la lista está cortada: un grupo leído a medias es una cifra creíble y falsa
    if (resultados.some((r) => Array.isArray(r) && r.length >= 5000)) return { ok: false, procesos: null, motivo: "demasiadas_filas" };
    procesos = procesosComparables(presupuestos, resultados.flatMap((r) => (Array.isArray(r) ? r : [])));
  }
  if (redis) { try { await redis.set(k, JSON.stringify({ procesos, adjudicados, consultado: new Date().toISOString() }), { ex: TTL_SEG }); } catch (e) { log(`grupo_ofertas: ${e && e.message}`); } }
  return { ok: true, procesos, adjudicados, desde: "datos.gov.co" };
}

/* LA REFERENCIA POR COMPETENCIA DE LA ENTIDAD (PLAN_X20, pieza 6.5, 12-nov-2026). Medido fuera de muestra el
   11-nov-2026 (tools/analisis/plan_x20/aproximacion.js): separar el precio ganador de la entidad por cuántos compiten
   acerca la referencia en licitación (a ±2 puntos: 47,5 % → 56,0 %) y en mínima cuantía (41,9 % → 51,5 %); en menor
   cuantía la mediana de la entidad ya está en el techo. Es un HECHO contado: a cuánto se adjudicó, en esta entidad y
   modalidad, cuando llegaron una o dos ofertas y cuando llegaron tres o más; cada mitad solo con MIN_PROCESOS o más. No
   es un porcentaje de ganar ni un precio sugerido (regla del 28-oct-2026). null sin adjudicados. */
function referenciaPorCompetencia(adjudicados) {
  if (!Array.isArray(adjudicados) || !adjudicados.length) return null;
  const v = adjudicados.filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isInteger(x[1]) && x[1] >= 1);
  const mitad = (f) => { const p = v.filter(f).map((x) => x[0]); return p.length >= MIN_PROCESOS ? { procesos: p.length, mediana_pct: mediana(p) } : { procesos: p.length, mediana_pct: null }; };
  const poca = mitad((x) => x[1] <= 2), mucha = mitad((x) => x[1] >= 3);
  const { numCO } = require("./lenguaje_pantalla.js");
  const parte = (m, cuando) => (m.mediana_pct != null ? `${cuando}, se adjudicó cerca del ${numCO(Math.round(m.mediana_pct * 10) / 10, 1)} % del presupuesto (${m.procesos} procesos)` : null);
  const partes = [parte(poca, "con una o dos ofertas"), parte(mucha, "con tres o más")].filter(Boolean);
  return { poca, mucha, frase: partes.length ? `En esta entidad, ${partes.join("; ")}.` : null };
}

const MOTIVO_TEXTO = Object.freeze({
  sin_nit: "Sin el NIT de la entidad no se pueden buscar sus procesos anteriores.",
  sin_modalidad: "Sin la modalidad del proceso no se comparan grupos de ofertas.",
  no_respondio: "No se pudo consultar las ofertas de los procesos anteriores de esta entidad: datos.gov.co no respondió a tiempo. Vuelva a calcular en unos minutos.",
  demasiadas_filas: "Las ofertas de los procesos anteriores de esta entidad son demasiadas para leerlas completas: no se dice nada antes que decirlo a medias.",
});

module.exports = { referenciaPorCompetencia, TANDA, MIN_PROCESOS, MIN_OFERTAS, MAX_PROCESOS, TTL_SEG, procesosComparables, precioFrenteAlGrupo, leerGrupo, MOTIVO_TEXTO, clave };
