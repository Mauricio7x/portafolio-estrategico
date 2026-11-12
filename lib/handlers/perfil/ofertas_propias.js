/* ============================================================================
   /api/perfil?op=ofertas-propias · SUS OFERTAS EN SECOP II Y CÓMO LE FUE (PLAN_X20, tanda 13, 12-nov-2026)
   ----------------------------------------------------------------------------
   GET ?perfil=X[&refrescar=1] → { ok, perfil, ofertas:[…], tablero:[…], frases:[…], consultado_el, desde_cache }
   Con credencial SIEMPRE: es el historial de ofertas de la empresa. La consulta (lib/ofertas_propias) hace de tres a
   cuatro pedidos a datos.gov.co, de 4 a más de 15 s según el día (medido el 12-nov-2026): el resultado que salió bien se
   guarda 12 horas (`cache:ofertas_propias:v2:{perfil}`; Precios lo lee para «Usted ya ofertó en esta entidad»); uno que falló no se guarda, para que el siguiente intento
   consulte otra vez. «refrescar=1» consulta aunque haya guardado.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const TTL_SEG = 12 * 3600;
const clave = (perfil) => `cache:ofertas_propias:v2:${perfil}`;   // v2 (12-nov-2026): cada oferta trae el NIT de la entidad, para Precios

module.exports = async function ofertasPropias(req, res, { consultar = null } = {}) {
  const q = req.query || {};
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (String(req.method || "GET").toUpperCase() !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "Use GET." }); }
  const perfil = String(q.perfil || "").trim();
  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
  const OP = require("../../ofertas_propias.js");
  const { nitsDelPerfil } = require("./seguimiento.js");
  const nits = nitsDelPerfil(perfil);
  const redis = hayCredenciales() ? crearRedis({}) : null;
  if (redis && String(q.refrescar || "") !== "1") {
    let j = null;
    try { const v = await redis.get(clave(perfil)); j = v ? (typeof v === "string" ? JSON.parse(v) : v) : null; }
    catch { j = null; /* sin caché: se consulta */ }
    if (j && j.ok && Array.isArray(j.ofertas)) return res.status(200).json({ ...(await conCausas(redis, j)), perfil, frases: OP.frasesOfertasPropias(j), desde_cache: true });
  }
  const r = await (consultar || OP.consultarOfertasPropias)(nits);
  if (redis && r.ok && !r.aviso) { try { await redis.set(clave(perfil), JSON.stringify(r), { ex: TTL_SEG }); } catch { /* sin caché */ } }
  return res.status(200).json({ ...(await conCausas(redis, r)), perfil, frases: OP.frasesOfertasPropias(r), desde_cache: false });
};
/* LA CAUSA DE CADA OFERTA (PLAN_X20 tanda 13): de la captura verificada de su informe de evaluación, si se leyó. Se calcula en
   cada respuesta y NO se guarda con la consulta: un informe que se lee después aparece sin esperar las 12 horas. Una captura
   que no se puede leer deja la oferta sin causa (no es «sin causa»: es «no se sabe»). */
async function conCausas(redis, r) {
  if (!redis || !r || !r.ok || !Array.isArray(r.ofertas) || !r.ofertas.length) return r;
  const E = require("../../evaluacion.js"), OP = require("../../ofertas_propias.js");
  const { leerJSONComprimido } = require("../../almacen.js");
  const ofertas = await Promise.all(r.ofertas.slice(0, 60).map(async (o) => {
    if (!o || !/^CO1\.BDOS\.\d+$/.test(String(o.id_portafolio || ""))) return o;
    let reg = null;
    try { reg = await leerJSONComprimido(redis, E.claveCaptura(o.id_portafolio)); } catch { return o; }
    const c = reg ? OP.causaDeLaOferta(o, reg) : null;
    return c ? { ...o, causa: c } : { ...o, causa: null };
  }));
  return { ...r, ofertas: [...ofertas, ...r.ofertas.slice(60)] };
}
module.exports.clave = clave;
module.exports.conCausas = conCausas;
module.exports.TTL_SEG = TTL_SEG;
