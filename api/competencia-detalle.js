/* ============================================================================
   /api/competencia-detalle · ¿CUÁLES son los procesos detrás del badge?
   ----------------------------------------------------------------------------
   GET /api/competencia-detalle?entidad=ALCALDÍA DE PURIFICACIÓN
       (token por header `x-historico-token` o por `?token=`)

   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Sin poder ver esos 12, el promedio es una caja negra: no hay forma de saber
   si son procesos de obra civil o de cualquier otra cosa. Este endpoint los
   entrega, y entrega TAMBIÉN los que quedaron fuera del promedio y por qué —
   incluida la razón de que una entidad aparezca en ⚪ «sin datos».

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/diagnostico (lib/auth):
   expone contenido del corpus. SOLO LEE el histórico; lo único que escribe es
   su propia caché.

   Lo que NO sale de aquí: adjudicatario y NIT del adjudicatario. Viven en el
   corpus histórico pero la proyección de la respuesta es una lista blanca
   (lib/competencia_detalle.proyectarProceso), igual que en /api/oportunidades.

   Caché: `indice:detalle:{entidad}` con TTL de 1 h. El valor guarda el sello
   de construcción del índice, así que reconstruir el índice invalida todos los
   detalles al instante sin borrar clave por clave. `?refrescar=1` la salta.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { autorizarToken } = require("../lib/auth.js");
const { detalleEntidad } = require("../lib/competencia_detalle.js");

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[competencia-detalle]", ...a); };

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false, error: permiso.error,
      ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
    });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  }

  const t0 = Date.now();
  let redis;
  try { redis = crearRedis({}); }
  catch (e) { return res.status(503).json({ ok: false, error: `Servicio de caché no disponible: ${e.message}` }); }

  try {
    const { estado, cuerpo } = await detalleEntidad(redis, q.entidad, {
      usarCache: q.refrescar !== "1",
      log: logDev,
    });
    return res.status(estado).json(
      estado === 200 ? { ...cuerpo, duracionMs: Date.now() - t0, comandosRedis: redis.comandos() } : cuerpo,
    );
  } catch (e) {
    // Redis caído, timeout o corpus ilegible: mensaje accionable, nunca un 500 mudo
    logDev("fallo:", e && e.message);
    return res.status(503).json({
      ok: false,
      error: "Servicio de caché no disponible. Intente de nuevo.",
      detalle: String((e && e.message) || e),
    });
  }
};
