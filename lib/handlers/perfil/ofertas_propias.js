/* ============================================================================
   /api/perfil?op=ofertas-propias · SUS OFERTAS EN SECOP II Y CÓMO LE FUE (PLAN_X20, tanda 13, 12-nov-2026)
   ----------------------------------------------------------------------------
   GET ?perfil=X[&refrescar=1] → { ok, perfil, ofertas:[…], tablero:[…], frases:[…], consultado_el, desde_cache }
   Con credencial SIEMPRE: es el historial de ofertas de la empresa. La consulta (lib/ofertas_propias) hace de tres a
   cuatro pedidos a datos.gov.co, de 4 a más de 15 s según el día (medido el 12-nov-2026): el resultado que salió bien se
   guarda 12 horas (`cache:ofertas_propias:v1:{perfil}`); uno que falló no se guarda, para que el siguiente intento
   consulte otra vez. «refrescar=1» consulta aunque haya guardado.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const TTL_SEG = 12 * 3600;
const clave = (perfil) => `cache:ofertas_propias:v1:${perfil}`;

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
    try { const v = await redis.get(clave(perfil)); const j = v ? (typeof v === "string" ? JSON.parse(v) : v) : null; if (j && j.ok && Array.isArray(j.ofertas)) return res.status(200).json({ ...j, perfil, frases: OP.frasesOfertasPropias(j), desde_cache: true }); }
    catch { /* sin caché: se consulta */ }
  }
  const r = await (consultar || OP.consultarOfertasPropias)(nits);
  if (redis && r.ok && !r.aviso) { try { await redis.set(clave(perfil), JSON.stringify(r), { ex: TTL_SEG }); } catch { /* sin caché */ } }
  return res.status(200).json({ ...r, perfil, frases: OP.frasesOfertasPropias(r), desde_cache: false });
};
module.exports.clave = clave;
module.exports.TTL_SEG = TTL_SEG;
