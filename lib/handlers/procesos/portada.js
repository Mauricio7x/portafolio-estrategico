/* lib/handlers/procesos/portada.js · GET /api/procesos?op=portada
   ─────────────────────────────────────────────────────────────────────────────
   El pulso del mercado para quien abre la app sin haber subido nada. SIN
   autenticación: son agregados de datos públicos (SECOP II), no cifras de
   ningún perfil. Solo LEE el agregado precalculado (`portada:resumen`, que
   escribe la sincronización al terminar): la petición del usuario nunca
   dispara el cálculo. Si no existe todavía responde `disponible:false` con el
   motivo, no se queda pensando. `?reconstruir=1` CON token lo recalcula (para
   el dueño, tras el despliegue o cuando quiera). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerPortada, reconstruirPortada } = require("../../portada.js");

const HORAS_VIEJO = 24;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});
  if (["1", "true"].includes(String(q.reconstruir || ""))) {
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
    try {
      const { cargarCorpus } = require("./listar.js");
      const { consultarPaa } = require("../../paa.js");
      const p = await reconstruirPortada(redis, { cargarCorpus, consultarPaa });
      if (!p) return res.status(200).json({ ok: true, disponible: false, motivo: "Todavía no hay corpus sincronizado: la portada se llena con la primera sincronización." });
    } catch (e) {
      return res.status(502).json({ ok: false, error: `No se pudo reconstruir la portada: ${e.message}` });
    }
  }
  let portada;
  try { portada = await leerPortada(redis); } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  if (!portada) {
    return res.status(200).json({
      ok: true, disponible: false,
      motivo: "La portada se calcula al terminar cada sincronización y todavía no se ha calculado ninguna. Vuelva en unos minutos.",
    });
  }
  const edadHoras = portada.generado ? (Date.now() - Date.parse(portada.generado)) / 3600000 : null;
  return res.status(200).json({
    ok: true, disponible: true, ...portada,
    edadHoras: edadHoras == null ? null : Math.round(edadHoras * 10) / 10,
    // más de 24 h: se dice, nunca se presenta un número viejo como de hoy
    desactualizada: edadHoras != null && edadHoras > HORAS_VIEJO,
  });
};
