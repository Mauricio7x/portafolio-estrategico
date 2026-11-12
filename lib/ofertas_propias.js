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
  procesos: () => process.env.SECOP_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.procesos}.json`,
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
      identificador: id, id_portafolio: texto(f.id_del_proceso_de_compra), referencia: texto(f.referencia_del_proceso), entidad: texto(f.entidad_compradora), nit_entidad: sinDv(f.nit_entidad_compradora),
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

/* SUS OFERTAS EN ESTA ENTIDAD (PLAN_X20 tanda 13, 12-nov-2026): para Precios, junto al grupo de la entidad. Por cada oferta suya
   ahí: el puesto por precio y la distancia a lo adjudicado (su valor frente al valor adjudicado, en %). Un HECHO de su historia,
   no un precio sugerido. El NIT se compara sin dígito de verificación (algunas entidades lo publican con él, otras sin él). */
function suyasEnLaEntidad(r, nitEntidad) {
  const nit = sinDv(nitEntidad);
  if (!r || !r.ok || !Array.isArray(r.ofertas) || !nit) return null;
  const aqui = r.ofertas.filter((o) => o && sinDv(o.nit_entidad) === nit);
  if (!aqui.length) return { ofertas: [], frase: "SECOP II no publica ofertas suyas en esta entidad." };
  const pct = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
  const una = (o) => {
    const ref = o.referencia ? String(o.referencia).replace(/\s*\(.*$/, "").trim() : o.id_portafolio;
    const partes = [`${ref}${o.fecha ? ` (${o.fecha.slice(0, 7)})` : ""}`];
    if (o.puesto_por_precio != null && o.ofertas_en_el_proceso > 1) partes.push(`${o.puesto_por_precio}.º de ${o.ofertas_en_el_proceso} por precio`);
    if (o.resultado === "gano") partes.push("adjudicada a usted");
    else if (o.resultado === "otro" && o.valor_cop > 0 && o.valor_adjudicado > 0) {
      const d = ((o.valor_cop - o.valor_adjudicado) / o.valor_adjudicado) * 100;
      partes.push(Math.abs(d) < 0.05 ? "al mismo valor de lo adjudicado" : `${pct(Math.abs(d))} % ${d > 0 ? "por encima" : "por debajo"} de lo adjudicado`);
    } else if (o.resultado === "sin_adjudicar") partes.push("sin adjudicar");
    return partes.join(", ");
  };
  return { ofertas: aqui.map((o) => ({ identificador: o.identificador, referencia: o.referencia, puesto_por_precio: o.puesto_por_precio, ofertas_en_el_proceso: o.ofertas_en_el_proceso, resultado: o.resultado })),
    frase: `Usted ya ofertó en esta entidad ${aqui.length === 1 ? "una vez" : `${aqui.length} veces`}: ${aqui.slice(0, 4).map(una).join("; ")}.` };
}

/* LA CAUSA DE UNA OFERTA (PLAN_X20 tanda 13, «guardar de cada una la causa», 12-nov-2026): de la captura VERIFICADA de su
   informe de evaluación (lib/evaluacion; la lee /evaluaciones desde la ventana de la entidad). Se busca su oferta por el
   nombre con que se presentó (la regla de oferentes de lib/evaluacion, que se LLAMA) y se dice el hecho:
   · rechazada, con el motivo que el informe sostiene;
   · hábil y otra ganó: si la captura está completa y trae los puntajes de las dos, cuánto perdió por precio y cuánto
     fuera del precio (total − precio), y en qué criterio, si el informe lo desglosa;
   · lo demás, «el informe no dice» o «no se encontró su oferta en el informe». Nunca una causa que la cita no sostiene. */
function causaDeLaOferta(oferta, registro) {
  const E = require("./evaluacion.js");
  const k = registro && registro.captura;
  if (!k || k.documento_util !== true || !Array.isArray(k.ofertas)) return null;
  const nombres = [oferta && oferta.proponente, oferta && oferta.via && oferta.via.nombre].filter(Boolean);
  const exacta = k.ofertas.filter((x) => nombres.some((n) => E.claveDeOferente(x.oferente) === E.claveDeOferente(n)));
  const mias = exacta.length ? exacta : k.ofertas.filter((x) => nombres.some((n) => E.parecido(x.oferente, n)));
  if (mias.length !== 1) return { tipo: "no_encontrada", frase: mias.length ? "El informe trae más de una oferta con un nombre como el suyo: no se sabe cuál es." : "Su oferta no aparece en lo que se leyó del informe de evaluación." };
  const m = mias[0];
  const dec = (n) => (Math.round(n * 100) / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (m.estado === "rechazada") return { tipo: "rechazada", motivo: m.motivo || null, frase: `Rechazada: ${m.motivo ? E.MOTIVO_TEXTO[m.motivo] || "otro motivo" : "el informe no dice el motivo"}${m.motivo_texto ? ` («${String(m.motivo_texto).slice(0, 160)}»)` : ""}.` };
  if (m.estado !== "habil") return { tipo: "sin_dato", frase: "El informe no dice si su oferta quedó hábil." };
  if (k.completa !== true || !k.adjudicatario) return { tipo: "habil", frase: "Quedó hábil; el informe leído no alcanza para decir por qué ganó otro." };
  const gan = k.ofertas.filter((x) => x.estado === "habil" && E.claveDeOferente(x.oferente) === E.claveDeOferente(k.adjudicatario.nombre));
  const g = gan.length === 1 ? gan[0] : null;
  if (!g || g === m) return { tipo: "habil", frase: "Quedó hábil; el informe leído no alcanza para decir por qué ganó otro." };
  const nums = [m.puntaje_precio, m.puntaje_total, g.puntaje_precio, g.puntaje_total];
  if (!nums.every((x) => typeof x === "number")) return { tipo: "habil", frase: `Quedó hábil y ganó ${g.oferente}; el informe leído no trae los puntajes de las dos.` };
  const dPrecio = Math.round((g.puntaje_precio - m.puntaje_precio) * 1e4) / 1e4, dTotal = Math.round((g.puntaje_total - m.puntaje_total) * 1e4) / 1e4, dFuera = Math.round((dTotal - dPrecio) * 1e4) / 1e4;
  const criterios = [];
  if (Array.isArray(m.otros_puntos) && Array.isArray(g.otros_puntos)) for (const x of g.otros_puntos) { const y = m.otros_puntos.find((z) => z.criterio === x.criterio); if (y && x.puntos - y.puntos > 0.01) criterios.push(E.CRITERIO_TEXTO[x.criterio] || x.criterio); }
  const partes = [];
  if (dPrecio > 0.01) partes.push(`${dec(dPrecio)} puntos por precio`);
  if (dFuera > 0.01) partes.push(`${dec(dFuera)} puntos fuera del precio${criterios.length ? ` (${criterios.join(", ")})` : ""}`);
  return { tipo: dFuera > 0.01 && dPrecio <= 0.01 ? "fuera_del_precio" : dPrecio > 0.01 && dFuera <= 0.01 ? "precio" : "puntos", diferencia_total: dTotal, diferencia_precio: dPrecio, diferencia_fuera: dFuera,
    frase: `Quedó hábil y ganó ${g.oferente}${partes.length ? `, que le sacó ${partes.join(" y ")}` : ""}.` };
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
  if (r.aviso) out.push(`Esta vez ${r.aviso.replace(/^no se pudo traer el puesto ni el resultado/, "no se pudo traer el puesto ni el resultado")}. Vuelva a consultar en un momento.`);
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
    const SEL = "identificador_de_la_oferta,id_del_proceso_de_compra,referencia_del_proceso,entidad_compradora,nit_entidad_compradora,fecha_de_registro,modalidad,nombre_proveedor,nit_del_proveedor,c_digo_proveedor,valor_de_la_oferta";
    /* si una de las dos falla, se sigue con la otra y se dice cuál faltó (la de los consorcios es la lenta: 140 códigos) */
    const [rNit, rCod] = await Promise.allSettled([
      conTiempo(co.pedir({ "$select": SEL, "$where": `nit_del_proveedor in (${lista(ids)})`, "$limit": "3000" }, "ofertas con su NIT", { plazoMs: tiempoMs }), tiempoMs),
      codigos.length ? conTiempo(co.pedir({ "$select": SEL, "$where": `c_digo_proveedor in (${lista(codigos)})`, "$limit": "3000" }, "ofertas de sus consorcios", { plazoMs: tiempoMs }), tiempoMs) : Promise.resolve([]),
    ]);
    if (rNit.status === "rejected" && rCod.status === "rejected") throw rNit.reason;
    const faltaron = [rNit.status === "rejected" ? "las ofertas con su NIT" : null, rCod.status === "rejected" ? "las ofertas de sus consorcios" : null].filter(Boolean);
    const porNit = rNit.status === "fulfilled" ? rNit.value : [], porCodigo = rCod.status === "fulfilled" ? rCod.value : [];
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
    const aviso = [faltaron.length ? `no se pudieron traer ${faltaron.join(" ni ")}: la lista puede estar corta` : null, avisoDetalle].filter(Boolean).join("; ") || null;
    return { ...base, ok: true, ...r, aviso, procesos_consultados: portafolios.length };
  } catch (e) {
    return { ...base, motivo: `No se pudo consultar SECOP II: ${String((e && e.message) || e).slice(0, 160)}` };
  }
}

module.exports = { causaDeLaOferta, suyasEnLaEntidad, ofertasPropiasDe, frasesOfertasPropias, consultarOfertasPropias, DATASETS, MAX_PROCESOS };
