"use strict";
/* ============================================================================
   lib/ofertas_propias · SUS OFERTAS EN SECOP II Y CÓMO LE FUE (PLAN_X20, tanda 13, pieza 6.8, 12-nov-2026)
   ----------------------------------------------------------------------------
   Para aprender de cada resultado hace falta saber primero a qué se presentó. SECOP II lo publica, pero repartido: una
   oferta en consorcio va a nombre del consorcio, no de sus integrantes. Se reconoce en tres fuentes de datos.gov.co:
     1. `ceth-n4bn` (integrantes de grupos de proveedores): los consorcios y uniones temporales donde figura el NIT, con
        su participación; su `codigo_grupo` es el `c_digo_proveedor` del consorcio en las ofertas;
     2. `wi7w-2nvm` (ofertas por proceso): las ofertas con su NIT o con el código de uno de esos consorcios; una oferta es
        su `identificador_de_la_oferta` (la fila se repite), como en lib/ofertas;
     3. `wi7w-2nvm` otra vez, por proceso, para el puesto por precio entre TODAS las ofertas (lib/ofertas.agruparOfertas:
        no se sabe cuáles quedaron hábiles), y `p6dx-8zbt` para el resultado publicado (a quién se adjudicó y por cuánto).
   MEDIDO el 12-nov-2026 con el NIT de Helder (9396710): 51 consorcios en el registro y 5 ofertas suyas en 5 procesos, todas
   de 2025, una adjudicada a él (E.S.E. Hospital San Antonio de Natagaima, CP-002-2025); las 2 de 2026 que trae la consulta
   por código son de Génesis (ver la regla de abajo). Las ofertas de
   Cali y de la Universidad Pedagógica que constan en el plan NO aparecen en `wi7w-2nvm`: la fuente está incompleta y se
   dice; lo que no aparece no es «no se presentó».
   Lo que no se sabe desde aquí (si quedó hábil, la causa de un rechazo, el puntaje) va «por confirmar».
   Nunca lanza: una fuente caída es `ok:false` con su motivo. PURA salvo `consultarOfertasPropias`.
   ============================================================================ */

const { crearCliente, escSoQL } = require("./socrata.js");

const DATASETS = { grupos: "ceth-n4bn", ofertas: "wi7w-2nvm", procesos: "p6dx-8zbt" };
const BASES = {
  grupos: () => process.env.GRUPOS_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.grupos}.json`,
  ofertas: () => process.env.OFERTAS_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.ofertas}.json`,
  procesos: () => process.env.PROCESOS_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.procesos}.json`,
};
const MAX_PROCESOS = 40;   // los procesos cuyo detalle se consulta (los más recientes); un contratista activo tiene decenas, no cientos
const TIEMPO_MS = 15000;   // por consulta; son tres en fila como máximo, dentro de los 60 s de la función de perfil (vercel.json). Medido el 12-nov-2026: la de las ofertas tardó de 3 a más de 9 s

const sinDv = (nit) => { const d = String(nit == null ? "" : nit).split("-")[0].replace(/\D/g, ""); return d.length >= 6 ? d : null; };
const texto = (v) => { const t = String(v == null ? "" : v).trim(); return t && !/^no definido$/i.test(t) ? t : null; };
const numero = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const normNombre = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

/* Lo publicado → la lista de sus ofertas con su puesto y su resultado, y el tablero por año. PURA.
   grupos: filas de ceth-n4bn · propias: filas de wi7w-2nvm (las suyas) · delProceso: { idPortafolio: filas de wi7w-2nvm }
   · procesos: filas de p6dx-8zbt de esos portafolios · nits: los NIT del perfil (sin DV) */
function ofertasPropiasDe({ grupos = [], propias = [], delProceso = {}, procesos = [], nits = [] } = {}) {
  const { agruparOfertas } = require("./ofertas.js");
  const misNits = new Set(nits.map(sinDv).filter(Boolean));
  const grupoPorCodigo = new Map();
  for (const g of grupos) {
    const cod = texto(g.codigo_grupo);
    if (!cod || !misNits.has(sinDv(g.nit_participante))) continue;
    const p = numero(g.participacion);
    grupoPorCodigo.set(cod, { nombre: texto(g.nombre_grupo), participacion_pct: p != null && p > 0 && p <= 100 ? p : null });
  }
  /* UNA OFERTA ES SUYA si va con uno de sus NIT, o a nombre de uno de sus consorcios Y ese consorcio está entre los códigos de
     la oferta. El código solo NO basta (medido el 12-nov-2026): la fila de una oferta se repite una vez por cada código
     asociado a la cuenta que la presentó, así que la oferta de una socia trae también los códigos de los consorcios que
     comparte con usted (Génesis en MEN-115-2026, con el código de «CONSORCIO SEDES SOCIALES HGR»), y no es suya. */
  const porOferta = new Map();
  for (const f of propias) {
    const id = texto(f.identificador_de_la_oferta);
    if (!id || !texto(f.id_del_proceso_de_compra) || /^confidencial$/i.test(id)) continue;
    const o = porOferta.get(id) || { filas: [], codigos: new Set() };
    o.filas.push(f); const c = texto(f.c_digo_proveedor); if (c) o.codigos.add(c);
    porOferta.set(id, o);
  }
  const gruposPorNombre = new Map();
  for (const [cod, g] of grupoPorCodigo) { if (!g.nombre) continue; const k = normNombre(g.nombre); if (!gruposPorNombre.has(k)) gruposPorNombre.set(k, []); gruposPorNombre.get(k).push({ codigo: cod, ...g }); }
  const unicas = new Map();
  for (const [id, { filas, codigos }] of porOferta) {
    const f = filas[0];
    const nitOferta = sinDv(f.nit_del_proveedor), nombre = texto(f.nombre_proveedor);
    const suNit = nitOferta && misNits.has(nitOferta);
    const deSuConsorcio = nombre ? (gruposPorNombre.get(normNombre(nombre)) || []).filter((g) => codigos.has(g.codigo)) : [];
    if (!suNit && !deSuConsorcio.length) continue;
    const v = numero(f.valor_de_la_oferta);
    unicas.set(id, {
      identificador: id, id_portafolio: texto(f.id_del_proceso_de_compra), referencia: texto(f.referencia_del_proceso), entidad: texto(f.entidad_compradora),
      fecha: texto(f.fecha_de_registro) ? String(f.fecha_de_registro).slice(0, 10) : null, modalidad: texto(f.modalidad),
      proponente: nombre, valor_cop: v != null && v > 0 ? Math.round(v) : null,
      // la participación solo si en el registro hay UN consorcio suyo con ese nombre (Helder tiene dos «CONSORCIO INFRAESTRUCTURA 1A», al 90 y al 60 %: no se elige)
      via: deSuConsorcio.length ? { tipo: "consorcio", nombre: deSuConsorcio[0].nombre, participacion_pct: (gruposPorNombre.get(normNombre(nombre)) || []).length === 1 ? deSuConsorcio[0].participacion_pct : null }
        : { tipo: "nit", nit: nitOferta },
    });
  }
  // el resultado publicado por portafolio: la fase adjudicada (puede haber otras fases sin adjudicar)
  const resultado = new Map();
  for (const r of procesos) {
    const pid = texto(r.id_del_portafolio);
    if (!pid) continue;
    const previo = resultado.get(pid);
    const adj = String(r.adjudicado || "").trim().toLowerCase() === "si";
    if (previo && previo.adjudicado && !adj) continue;
    resultado.set(pid, { adjudicado: adj, adjudicatario: adj ? texto(r.nombre_del_proveedor) : null, nit_adjudicatario: adj ? sinDv(r.nit_del_proveedor_adjudicado) : null,
      valor_adjudicado: adj ? numero(r.valor_total_adjudicacion) : null, presupuesto: numero(r.precio_base), estado: texto(r.estado_del_procedimiento) });
  }
  const lista = [...unicas.values()].map((o) => {
    const res = resultado.get(o.id_portafolio) || null;
    const ganadores = res && res.adjudicado && res.adjudicatario ? [{ nombre: res.adjudicatario, valor: res.valor_adjudicado }] : [];
    const filas = Array.isArray(delProceso[o.id_portafolio]) ? delProceso[o.id_portafolio] : null;
    const g = filas ? agruparOfertas(filas, { presupuestoCop: res ? res.presupuesto : null, ganadores }) : null;
    const mia = g ? g.ofertas.find((x) => x.identificador === o.identificador) : null;
    const n = g ? g.ofertas.filter((x) => x.valor_cop != null).length : null;
    // ¿ganó? el adjudicatario es usted (NIT), el consorcio con que ofertó (nombre) o la oferta marcada como adjudicada
    let gano = null;
    if (res && res.adjudicado) {
      gano = !!((res.nit_adjudicatario && misNits.has(res.nit_adjudicatario)) || (mia && mia.adjudicada)
        || (res.adjudicatario && ((o.proponente && normNombre(res.adjudicatario) === normNombre(o.proponente)) || (o.via.nombre && normNombre(res.adjudicatario) === normNombre(o.via.nombre)))));
    }
    return {
      ...o, presupuesto: res ? res.presupuesto : null,
      ofertas_en_el_proceso: n, puesto_por_precio: mia && mia.puesto != null ? mia.puesto : null,
      resultado: !res ? "sin_dato" : res.adjudicado ? (gano ? "gano" : "otro") : "sin_adjudicar",
      adjudicatario: res && res.adjudicado ? res.adjudicatario : null, valor_adjudicado: res && res.adjudicado ? res.valor_adjudicado : null,
      estado: res ? res.estado : null,
    };
  }).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  // el tablero por año (sección 8 del plan): ofertas, adjudicadas a usted, con resultado y el puesto por precio mediano
  const porAno = new Map();
  for (const o of lista) {
    const a = o.fecha ? o.fecha.slice(0, 4) : "sin fecha";
    const t = porAno.get(a) || { ano: a, ofertas: 0, ganadas: 0, con_resultado: 0, puestos: [] };
    t.ofertas++;
    if (o.resultado === "gano") t.ganadas++;
    if (o.resultado === "gano" || o.resultado === "otro") t.con_resultado++;
    if (o.puesto_por_precio != null && o.ofertas_en_el_proceso > 1) t.puestos.push(o.puesto_por_precio);
    porAno.set(a, t);
  }
  const mediana = (v) => { if (!v.length) return null; const s = v.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const tablero = [...porAno.values()].map((t) => ({ ano: t.ano, ofertas: t.ofertas, ganadas: t.ganadas, con_resultado: t.con_resultado, sin_resultado: t.ofertas - t.con_resultado, puesto_mediano: mediana(t.puestos) }))
    .sort((a, b) => b.ano.localeCompare(a.ano));
  return { ofertas: lista, tablero, consorcios_en_el_registro: grupoPorCodigo.size };
}

/* Las frases para la pantalla. */
function frasesOfertasPropias(r) {
  if (!r || !r.ok) return [r && r.motivo ? r.motivo : "No se pudo consultar sus ofertas."];
  const out = [];
  if (!r.ofertas.length) out.push("SECOP II no publica ninguna oferta con su NIT ni con los consorcios donde usted figura.");
  else {
    /* «sin dato» ≠ 0: si no se pudo saber el resultado de una oferta, no cuenta como «no adjudicada a usted» */
    const t = r.tablero.map((x) => `${x.ano}: ${x.ofertas} ${x.ofertas === 1 ? "oferta" : "ofertas"}`
      + (x.con_resultado ? `, ${x.ganadas} ${x.ganadas === 1 ? "adjudicada" : "adjudicadas"} a usted${x.con_resultado - x.ganadas > 0 ? `, ${x.con_resultado - x.ganadas} a otro` : ""}` : "")
      + (x.sin_resultado ? `, ${x.sin_resultado} sin resultado ${x.sin_resultado === 1 ? "conocido" : "conocidos"}` : ""));
    out.push(`SECOP II publica ${r.ofertas.length} ${r.ofertas.length === 1 ? "oferta suya" : "ofertas suyas"} (a su nombre o de los consorcios donde figura). ${t.join(" · ")}.`);
  }
  if (r.aviso) out.push(`El puesto y el resultado no se pudieron traer esta vez: ${r.aviso.replace(/^no se pudo traer el puesto ni el resultado\s*/, "").replace(/^\(|\)$/g, "")}. Vuelva a consultar en un momento.`);
  out.push("La fuente está incompleta: una oferta que no aparece aquí no quiere decir que no se presentó. El puesto es por precio entre todas las ofertas publicadas: no se sabe cuáles quedaron hábiles.");
  return out;
}

const conTiempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`la fuente no respondió en ${Math.round(ms / 1000)} s`)), ms))]);

/* La consulta: tres o cuatro pedidos a datos.gov.co. Nunca lanza. */
async function consultarOfertasPropias(nits, { fetchImpl, log = () => {}, tiempoMs = TIEMPO_MS } = {}) {
  const ids = [...new Set((Array.isArray(nits) ? nits : []).map(sinDv).filter(Boolean))];
  const base = { ok: false, fuentes: Object.values(DATASETS), consultado_el: new Date().toISOString(), ofertas: [], tablero: [], motivo: null };
  if (!ids.length) return { ...base, motivo: "El perfil no tiene NIT: no se pueden buscar sus ofertas en SECOP II." };
  const lista = (xs) => xs.map((x) => `'${escSoQL(x)}'`).join(",");
  try {
    const cg = crearCliente({ baseUrl: BASES.grupos(), fetchImpl, log }), co = crearCliente({ baseUrl: BASES.ofertas(), fetchImpl, log }), cp = crearCliente({ baseUrl: BASES.procesos(), fetchImpl, log });
    const grupos = await conTiempo(cg.pedir({ "$select": "codigo_grupo,nombre_grupo,nit_participante,participacion", "$where": `nit_participante in (${lista(ids)})`, "$limit": "1000" }, "consorcios del perfil", { plazoMs: tiempoMs }), tiempoMs);
    const codigos = [...new Set((grupos || []).map((g) => texto(g.codigo_grupo)).filter(Boolean))].slice(0, 300);
    /* dos consultas en paralelo, una por columna: con «O» entre las dos columnas la fuente pasaba de 15 s (medido el 12-nov-2026 con
       Helder y Génesis, 140 consorcios); separadas, de 4 a 6 s cada una */
    const SEL = "identificador_de_la_oferta,id_del_proceso_de_compra,referencia_del_proceso,entidad_compradora,fecha_de_registro,modalidad,nombre_proveedor,nit_del_proveedor,c_digo_proveedor,valor_de_la_oferta";
    const [porNit, porCodigo] = await Promise.all([
      conTiempo(co.pedir({ "$select": SEL, "$where": `nit_del_proveedor in (${lista(ids)})`, "$limit": "3000" }, "ofertas con su NIT", { plazoMs: tiempoMs }), tiempoMs),
      codigos.length ? conTiempo(co.pedir({ "$select": SEL, "$where": `c_digo_proveedor in (${lista(codigos)})`, "$limit": "3000" }, "ofertas de sus consorcios", { plazoMs: tiempoMs }), tiempoMs) : Promise.resolve([]),
    ]);
    const propias = [...(porNit || []), ...(porCodigo || [])].sort((a, b) => String(b.fecha_de_registro || "").localeCompare(String(a.fecha_de_registro || "")));
    const portafolios = [...new Set((propias || []).map((f) => texto(f.id_del_proceso_de_compra)).filter(Boolean))].slice(0, MAX_PROCESOS);
    let delProceso = {}, procesos = [], avisoDetalle = null;
    if (portafolios.length) {
      try {
        const [todas, res] = await Promise.all([
          conTiempo(co.pedir({ "$select": "identificador_de_la_oferta,id_del_proceso_de_compra,nombre_proveedor,nit_del_proveedor,valor_de_la_oferta,moneda", "$where": `id_del_proceso_de_compra in (${lista(portafolios)})`, "$limit": "20000" }, "ofertas de sus procesos", { plazoMs: tiempoMs }), tiempoMs),
          conTiempo(cp.pedir({ "$select": "id_del_portafolio,adjudicado,nombre_del_proveedor,nit_del_proveedor_adjudicado,valor_total_adjudicacion,precio_base,estado_del_procedimiento", "$where": `id_del_portafolio in (${lista(portafolios)})`, "$limit": "2000" }, "resultado de sus procesos", { plazoMs: tiempoMs }), tiempoMs),
        ]);
        for (const f of todas || []) { const k = texto(f.id_del_proceso_de_compra); if (k) (delProceso[k] || (delProceso[k] = [])).push(f); }
        procesos = res || [];
      } catch (e) { avisoDetalle = `no se pudo traer el puesto ni el resultado (${String((e && e.message) || e).slice(0, 120)})`; delProceso = {}; procesos = []; }
    }
    const r = ofertasPropiasDe({ grupos: grupos || [], propias: propias || [], delProceso, procesos, nits: ids });
    return { ...base, ok: true, ...r, aviso: avisoDetalle, procesos_consultados: portafolios.length };
  } catch (e) {
    return { ...base, motivo: `No se pudo consultar SECOP II: ${String((e && e.message) || e).slice(0, 160)}` };
  }
}

module.exports = { ofertasPropiasDe, frasesOfertasPropias, consultarOfertasPropias, DATASETS, MAX_PROCESOS };
