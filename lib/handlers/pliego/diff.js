/* lib/handlers/pliego/diff.js · /api/pliego?op=diff (Fase 5 · vigía del TEXTO del pliego)
     POST {id_proceso, texto, perfil?, origen?}  → registra la versión (hash + texto
          normalizado en pliego:{proceso}:v:{n}); si cambió, el diff por párrafos en
          pliego:{proceso}:diff:{n} y los habilitantes reevaluados contra el perfil.
     GET  ?id_proceso=…&perfil=…               → versiones y último diff (reevaluado).
   Con token (el texto de un pliego es público, pero la reevaluación habla del
   perfil). Cuerpo hasta 3 MB (el texto de un pliego de 120 páginas son ~0,34 MB). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const D = require("../../diff.js");

const MAX_BYTES = 3 * 1024 * 1024;
const ID_RE = /^[A-Za-z0-9._-]{3,120}$/;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const id = String(q.id_proceso || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id_proceso= (el id del proceso en SECOP II)." });
    const r = await D.ultimoDiff(redis, id, String(q.perfil || "").trim() || null);
    return res.status(200).json({ ok: true, id_proceso: id, ...r, cambio: !!(r.diff), como_leerlo: "«diff.habilitantes.cambios» es lo que importa: cada requisito que cambió, con «le afecta» decidido contra el perfil. El diff de párrafos viaja para quien lo quiera ver." });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use POST {id_proceso, texto, perfil?}." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  const id = String(datos.id_proceso || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta id_proceso (el id del proceso en SECOP II, p. ej. CO1.REQ.123)." });
  const texto = String(datos.texto || "");
  if (texto.trim().length < 50) return res.status(400).json({ ok: false, error: "El texto del pliego llegó vacío o demasiado corto para vigilarlo." });
  const r = await D.registrarVersion(redis, { idProceso: id, texto, origen: String(datos.origen || "lector").slice(0, 40), perfilId: String(datos.perfil || "").trim() || null });
  return res.status(200).json({
    ok: true, id_proceso: id, ...r,
    mensaje: r.cambio ? "La entidad cambió las reglas de este proceso desde la última vez que lo abrió." : (r.version === 1 ? "Primera vez que se guarda este pliego: a partir de ahora, cada vez que lo abra se comparará con esta versión." : "El pliego no cambió desde la última vez."),
  });
};
