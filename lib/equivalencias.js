/* ============================================================================
   lib/equivalencias · Qué clases UNSPSC son AFINES en el mercado real
   ----------------------------------------------------------------------------
   El corpus histórico (procesos ya adjudicados, con adjudicatario) es un
   conjunto ETIQUETADO gratis: dice qué empresas ganan qué. Si los mismos
   contratistas ganan sistemáticamente en la clase A (inscrita en el RUP) y en
   la clase B (no inscrita), es que el mercado las trata como el mismo tipo de
   trabajo — y un proceso publicado en B probablemente sea presentable.

   Es una AYUDA a la decisión, no una habilitación jurídica: quien decide si el
   RUP alcanza es el pliego. Por eso el tier "equivalente" es más débil que
   "clase" y la tarjeta lo dice con todas sus letras.

   MEDIDA: lift (elevación) sobre los ADJUDICATARIOS, no sobre los procesos.
     P(gana en B | gana en A)      |A ∩ B| / |A|
     lift(A,B) = ───────────────── = ─────────────
     P(gana en B)                    |B| / total
   lift = 1 → independencia (coincidir es casualidad). lift ≥ 3 → un ganador de
   A tiene el triple de probabilidad de ganar también en B que un adjudicatario
   cualquiera. Se cuenta por ADJUDICATARIO y no por proceso a propósito: una
   sola entidad que saque 40 procesos gemelos no puede fabricar una equivalencia.

   UMBRALES (conservadores; se reportan en la meta para poder moverlos con dato):
     lift ≥ 3            fuerza de la asociación
     soporte(A) ≥ 20     procesos históricos en la clase A (si A es marginal, el
                         cociente es ruido)
     |A ∩ B| ≥ 5         adjudicatarios distintos en la intersección

   SOLO se guardan pares con A dentro de la UNIÓN de los dos RUP: el índice
   existe para rescatar códigos NO inscritos, así que cualquier otro par sobra
   y solo haría crecer el valor de Redis.

   Construcción REANUDABLE mes a mes (como el índice de competencia) y
   publicación con swap atómico. El acumulador que se persiste es por
   ADJUDICATARIO (un array de clases), no por proceso.
   ========================================================================== */
"use strict";

const {
  CLAVES, leerChunksDedup, leerJSON, escribirJSON,
  leerJSONComprimido, escribirJSONComprimido,
} = require("./almacen.js");
const { norm } = require("./semantica.js");
const { codigosDeLicitacion, INDICE_JUNTOS } = require("./unspsc.js");
const { CAMPOS_ADJUDICATARIO, CAMPOS_ADJUDICATARIO_NIT, esAdjudicado } = require("./indice_competencia.js");

const LIFT_MIN = 3;
const SOPORTE_MIN = 20;          // procesos históricos en la clase A
const NITS_INTERSECCION_MIN = 5; // adjudicatarios distintos que ganaron en A y en B
const MAX_EQUIVALENTES = 5;      // por clase B (se guardan los de mayor lift)
const MAX_CLASES_POR_NIT = 40;   // cota de cordura: un NIT con 200 clases es basura
/* Cota dura del acumulador: Upstash tope 1 MB por valor. Si se alcanza, se
   DEJAN DE INCORPORAR adjudicatarios nuevos y queda escrito en la meta
   (`truncado`): un tope silencioso se leería como «no hay equivalencias». */
const MAX_NITS = 60000;

/* ---------- identidad del adjudicatario ---------- */
/* NIT primero (estable); si el dataset no lo trae, el nombre normalizado.
   Cuántos cayeron al respaldo queda en la meta: si son muchos, la señal es
   más ruidosa y conviene saberlo. */
/* «No Definido» NO es un adjudicatario. El literal está documentado para el
   NIT (donde el filtro de dígitos ya lo descartaba), pero la PRODUCCIÓN lo
   trae también como NOMBRE: en una gobernación real agrupaba 57 procesos bajo
   un «ganador» falso y disparaba una alerta de concentración del 54 % — la
   cifra creíble y equivocada exactamente. Un relleno del dataset es SIN DATO,
   no una identidad. */
const ADJUDICATARIO_RELLENO = new Set([
  "no definido", "no definida", "sin definir", "no adjudicado", "no aplica", "por definir",
]);

function claveAdjudicatario(lic) {
  for (const c of CAMPOS_ADJUDICATARIO_NIT) {
    const v = String(lic[c] == null ? "" : lic[c]).replace(/\D/g, "");
    if (v.length >= 5) return { clave: `nit:${v}`, porNombre: false };
  }
  for (const c of CAMPOS_ADJUDICATARIO) {
    const v = norm(lic[c]);
    if (v.length >= 4 && !ADJUDICATARIO_RELLENO.has(v)) return { clave: `n:${v}`, porNombre: true };
  }
  return { clave: null, porNombre: false };
}

/* Clases (6 dígitos) declaradas por el proceso. Nivel ≥ clase: una familia o
   un segmento sueltos no identifican un tipo de trabajo. */
function clasesDe(lic) {
  const out = [];
  for (const c of codigosDeLicitacion(lic).codigos) {
    if (c.nivel >= 6 && !out.includes(c.clase)) out.push(c.clase);
  }
  return out;
}

/* ---------- acumulación ---------- */
function acumular(acc, stats, lic) {
  stats.filas++;
  if (!esAdjudicado(lic)) { stats.sin_adjudicacion++; return; }
  const { clave, porNombre } = claveAdjudicatario(lic);
  if (!clave) { stats.sin_adjudicatario++; return; }
  const clases = clasesDe(lic);
  if (!clases.length) { stats.sin_clase++; return; }
  if (porNombre) stats.por_nombre++;

  for (const cl of clases) acc.procesosPorClase[cl] = (acc.procesosPorClase[cl] || 0) + 1;

  let mias = acc.porNit[clave];
  if (!mias) {
    if (acc.nNits >= MAX_NITS) { stats.nits_descartados++; return; }
    mias = acc.porNit[clave] = [];
    acc.nNits++;
  }
  for (const cl of clases) {
    if (mias.length >= MAX_CLASES_POR_NIT) break;
    if (!mias.includes(cl)) mias.push(cl);
  }
  stats.contados++;
}

/* ---------- cálculo de pares ---------- */
/* De {nit: [clases]} a {claseB: [{clase:A, lift, …}]}. Complejidad: Σ|S|² por
   adjudicatario, acotada por MAX_CLASES_POR_NIT. */
function calcularPares(acc) {
  const nitsPorClase = new Map();     // clase → nº de adjudicatarios
  const interseccion = new Map();     // "A|B" → nº de adjudicatarios en ambas
  let totalNits = 0;

  for (const clases of Object.values(acc.porNit)) {
    totalNits++;
    for (const c of clases) nitsPorClase.set(c, (nitsPorClase.get(c) || 0) + 1);
    for (const a of clases) {
      if (!INDICE_JUNTOS.clases.has(a)) continue;           // A debe estar en algún RUP
      for (const b of clases) {
        if (b === a || INDICE_JUNTOS.clases.has(b)) continue; // B debe estar FUERA
        const k = `${a}|${b}`;
        interseccion.set(k, (interseccion.get(k) || 0) + 1);
      }
    }
  }

  const mapa = {};
  let evaluados = 0;
  /* Por qué NO nació cada par. Sin esto, un índice vacío es indistinguible de
     «no hay nada que aprender» y de «los umbrales están mal puestos» — que fue
     exactamente la duda al ver el primer backfill real. */
  const fallos = { pocos_adjudicatarios: 0, poco_soporte: 0, lift_bajo: 0 };
  const casiLoLogran = [];
  for (const [k, inter] of interseccion) {
    evaluados++;
    const [a, b] = k.split("|");
    const soporte = acc.procesosPorClase[a] || 0;
    const nA = nitsPorClase.get(a) || 0, nB = nitsPorClase.get(b) || 0;
    const lift = (nA && nB && totalNits) ? (inter / nA) / (nB / totalNits) : 0;
    const falla = inter < NITS_INTERSECCION_MIN ? "pocos_adjudicatarios"
      : soporte < SOPORTE_MIN ? "poco_soporte"
      : !(lift >= LIFT_MIN) ? "lift_bajo" : null;
    if (falla) {
      fallos[falla]++;
      casiLoLogran.push({
        clase_rup: a, clase_afin: b, adjudicatarios: inter, soporte,
        lift: Math.round(lift * 100) / 100, falla,
      });
      continue;
    }
    (mapa[b] = mapa[b] || []).push({
      clase: a, lift: Math.round(lift * 100) / 100, adjudicatarios: inter, soporte,
    });
  }
  for (const b of Object.keys(mapa)) {
    mapa[b].sort((x, y) => y.lift - x.lift || y.adjudicatarios - x.adjudicatarios);
    mapa[b] = mapa[b].slice(0, MAX_EQUIVALENTES);
  }
  // los que estuvieron más cerca primero: son los candidatos a revisar si se
  // quisiera mover un umbral (con el dato delante, no a ojo)
  casiLoLogran.sort((x, y) => y.adjudicatarios - x.adjudicatarios || y.lift - x.lift);
  return {
    mapa, totalNits, pares_evaluados: evaluados, clases_distintas: nitsPorClase.size,
    fallos, casi: casiLoLogran.slice(0, 10),
  };
}

/* ============================ ¿por qué no hay equivalencias? ============================
   Traduce la meta a causas en castellano. Se usa desde /api/diagnostico: un
   índice vacío tiene cuatro explicaciones posibles y el dueño no tiene forma
   de distinguirlas mirando un 0. */
function explicarEquivalencias(meta) {
  if (!meta) {
    return {
      hay: false,
      por_que: ["Nunca se construyeron: falta correr GET /api/sync/historico?reconstruir_equivalencias=true (o el backfill completo)."],
      que_hacer: "Lanzar la reconstrucción con el token; no re-extrae nada del dataset.",
    };
  }
  if (meta.pares > 0) {
    return {
      hay: true,
      por_que: [`${meta.pares} pares aprendidos sobre ${meta.adjudicatarios} adjudicatarios y ${meta.procesos_contados} procesos históricos.`],
      que_hacer: null,
    };
  }
  const d = meta.descartados || {};
  const f = (meta.fallos_por_umbral) || {};
  const razones = [];
  if (meta.vacio || !meta.procesos_contados) {
    razones.push("El corpus histórico está vacío o ningún proceso llegó a contarse: sin adjudicaciones no hay nada que aprender.");
  }
  if (d.sin_adjudicacion) {
    razones.push(`${d.sin_adjudicacion} procesos históricos no traen evidencia de adjudicación (columna de adjudicatario/estado): no cuentan.`);
  }
  if (d.sin_adjudicatario) {
    razones.push(`${d.sin_adjudicatario} procesos están adjudicados pero SIN nombre ni NIT del adjudicatario en el dataset — es la causa típica: la afinidad se mide por quién gana, y si no se sabe quién ganó no hay señal. Revisar los nombres de columna en lib/indice_competencia.CAMPOS_ADJUDICATARIO*.`);
  }
  if (d.sin_clase) {
    razones.push(`${d.sin_clase} procesos adjudicados no declaran una clase UNSPSC de 6 dígitos (solo familia o segmento): no se pueden emparejar.`);
  }
  if (meta.pares_evaluados === 0) {
    razones.push("Ningún adjudicatario ganó en dos clases distintas a la vez (una dentro de los RUP y otra fuera): sin intersecciones no hay pares que evaluar.");
  } else {
    if (f.pocos_adjudicatarios) razones.push(`${f.pocos_adjudicatarios} pares se quedaron por debajo de los ${meta.umbrales ? meta.umbrales.adjudicatarios_min : NITS_INTERSECCION_MIN} adjudicatarios en común.`);
    if (f.poco_soporte) razones.push(`${f.poco_soporte} pares no alcanzan los ${meta.umbrales ? meta.umbrales.soporte_min : SOPORTE_MIN} procesos de soporte en la clase inscrita.`);
    if (f.lift_bajo) razones.push(`${f.lift_bajo} pares tienen lift por debajo de ${meta.umbrales ? meta.umbrales.lift_min : LIFT_MIN}: coincidir tan poco es casualidad, no afinidad.`);
  }
  if (meta.identificados_por_nombre) {
    razones.push(`${meta.identificados_por_nombre} adjudicatarios se identificaron por NOMBRE (sin NIT): la señal es más ruidosa de lo normal.`);
  }
  if (!razones.length) razones.push("El corpus tiene datos, pero ningún par superó los umbrales. Ampliar el rango del backfill suele ser lo que más aporta.");
  return {
    hay: false,
    por_que: razones,
    casi_lo_logran: meta.casi_lo_logran || [],
    que_hacer: (d.sin_adjudicatario > (meta.procesos_contados || 0))
      ? "Verificar los nombres de las columnas de adjudicatario contra el dataset real y volver a reconstruir (no hay que re-extraer)."
      : "Ampliar el rango del backfill (más años ⇒ más adjudicatarios en común) antes de tocar los umbrales.",
  };
}

/* ============================ construirEquivalencias ============================
   Recorre el corpus histórico mes a mes, reanudable por presupuesto. */
async function construirEquivalencias(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.equivalenciasProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = {
      iniciado: new Date().toISOString(),
      pendientes: [...porMes.keys()].sort(),
      acc: { porNit: {}, procesosPorClase: {}, nNits: 0 },
      stats: { filas: 0, contados: 0, sin_adjudicacion: 0, sin_adjudicatario: 0, sin_clase: 0, por_nombre: 0, nits_descartados: 0, meses: 0 },
    };
  }
  if (!porMes.size && !p.acc.nNits) {
    await redis.del(CLAVES.equivalencias, CLAVES.equivalenciasProgreso);
    const meta = {
      construido: new Date().toISOString(), vacio: true, pares: 0, clases_con_equivalente: 0,
      procesos_contados: 0, pares_evaluados: 0,
      umbrales: { lift_min: LIFT_MIN, soporte_min: SOPORTE_MIN, adjudicatarios_min: NITS_INTERSECCION_MIN },
      msg: "no hay corpus histórico todavía: sin equivalencias que aprender",
    };
    await escribirJSON(redis, CLAVES.equivalenciasMeta, meta);
    return { done: true, ...meta };
  }

  while (p.pendientes.length) {
    if (Date.now() - t0 > presupuestoMs) {
      await escribirJSONComprimido(redis, CLAVES.equivalenciasProgreso, p);
      return { done: false, pendientes: p.pendientes.length, adjudicatarios: p.acc.nNits };
    }
    const mes = p.pendientes[0];
    const registros = await leerChunksDedup(redis, porMes.get(mes) || []);
    for (const r of registros) acumular(p.acc, p.stats, r);
    p.stats.meses++;
    p.pendientes.shift();
    await escribirJSONComprimido(redis, CLAVES.equivalenciasProgreso, p);
    log(`equivalencias: ${mes} → ${registros.length} procesos (${p.acc.nNits} adjudicatarios)`);
  }

  const { mapa, totalNits, pares_evaluados, clases_distintas, fallos, casi } = calcularPares(p.acc);
  await escribirJSONComprimido(redis, CLAVES.equivalencias, mapa);

  const meta = {
    construido: new Date().toISOString(),
    clases_con_equivalente: Object.keys(mapa).length,
    pares: Object.values(mapa).reduce((a, v) => a + v.length, 0),
    adjudicatarios: totalNits,
    pares_evaluados, clases_distintas,
    // por qué no nacieron los demás pares: /api/diagnostico lo traduce a
    // causas en castellano (explicarEquivalencias)
    fallos_por_umbral: fallos,
    casi_lo_logran: casi,
    procesos_contados: p.stats.contados,
    filas_leidas: p.stats.filas,
    umbrales: { lift_min: LIFT_MIN, soporte_min: SOPORTE_MIN, adjudicatarios_min: NITS_INTERSECCION_MIN },
    descartados: {
      sin_adjudicacion: p.stats.sin_adjudicacion,
      sin_adjudicatario: p.stats.sin_adjudicatario,
      sin_clase: p.stats.sin_clase,
      adjudicatarios_no_incorporados: p.stats.nits_descartados,
    },
    identificados_por_nombre: p.stats.por_nombre, // sin NIT en el dataset: señal más ruidosa
    truncado: p.stats.nits_descartados > 0,
    meses: p.stats.meses,
  };
  await escribirJSON(redis, CLAVES.equivalenciasMeta, meta);
  await redis.del(CLAVES.equivalenciasProgreso);
  log(`equivalencias publicadas: ${meta.clases_con_equivalente} clases con afinidad (${meta.pares} pares)`);
  return { done: true, ...meta };
}

/* ============================ lectura y uso ============================ */
async function leerEquivalencias(redis) { return leerJSONComprimido(redis, CLAVES.equivalencias); }
async function leerEquivalenciasMeta(redis) { return leerJSON(redis, CLAVES.equivalenciasMeta); }

/* ¿Alguna clase del proceso es AFÍN a una clase inscrita en el RUP del perfil?
   Función pura (sin Redis): recibe el mapa ya cargado. La usa lib/filtros en
   el paso 6 de la cascada, solo si la jerarquía dijo "ninguno". */
function equivalenteDe(mapa, codigos, idxPerfil) {
  if (!mapa || !codigos || !codigos.length) return null;
  let mejor = null;
  for (const c of codigos) {
    if (c.nivel < 6) continue;
    const cands = Object.prototype.hasOwnProperty.call(mapa, c.clase) ? mapa[c.clase] : null;
    if (!cands) continue;
    for (const e of cands) {
      if (!idxPerfil.clases.has(e.clase)) continue; // afín, pero a algo que ESTE perfil no tiene
      if (!mejor || e.lift > mejor.lift) {
        mejor = {
          tier: "equivalente", codigo_proceso: c.codigo, codigo_rup: `${e.clase}00`,
          lift: e.lift, adjudicatarios: e.adjudicatarios,
          mensaje: `Clase afín a ${e.clase}00 — evidencia histórica de mercado (lift ${e.lift}, ${e.adjudicatarios} adjudicatarios en común)`,
        };
      }
    }
  }
  return mejor;
}

module.exports = {
  LIFT_MIN, SOPORTE_MIN, NITS_INTERSECCION_MIN, MAX_EQUIVALENTES, MAX_NITS,
  claveAdjudicatario, clasesDe, acumular, calcularPares,
  construirEquivalencias, leerEquivalencias, leerEquivalenciasMeta, equivalenteDe,
  explicarEquivalencias,
};
