/* ============================================================================
   /api/competencia-detalle · AUDITORÍA de las dos cifras que enseña la tarjeta
   ----------------------------------------------------------------------------
   DOS VISTAS, una sola función serverless:

     GET /api/competencia-detalle?entidad=ALCALDÍA DE PURIFICACIÓN
         ¿CUÁLES son los procesos detrás del badge de competencia?
     GET /api/competencia-detalle?vista=probabilidad&id_proceso=CO1.REQ.123
         ¿POR QUÉ ese «Prob. estimada: 23 %»? — el desglose paso a paso.
         Alias público: /api/probabilidad-desglose (rewrite de vercel.json).

     (token por header `x-historico-token` o por `?token=`)

   POR QUÉ VAN JUNTAS, que no es una decisión estética: el plan Hobby de Vercel
   admite 12 funciones por despliegue y el repositorio está EXACTAMENTE en 12
   (hay prueba que las cuenta). Un archivo más y no falla el endpoint nuevo:
   falla el despliegue entero. Es la misma restricción que plegó
   `/api/apu/catalogo` en `api/apu/[accion].js` y que impidió `/api/baja-mercado`.
   Y encajan: las dos responden la MISMA pregunta —«de dónde sale ese número de
   la tarjeta»— sobre el mismo corpus y con el mismo token.

   La URL literal del encargo, `/api/probabilidad-desglose`, existe como
   `rewrite` de vercel.json, que no cuenta como función. Hay prueba de que
   apunta aquí CON `vista=probabilidad`. El frontend llama a la CANÓNICA: si el
   rewrite fallara, el modal tiene que seguir funcionando (misma lección que
   `/api/admin/cargar-experiencia-genesis`).

   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Sin poder ver esos 12, el promedio es una caja negra: no hay forma de saber
   si son procesos de obra civil o de cualquier otra cosa. Este endpoint los
   entrega, y entrega TAMBIÉN los que quedaron fuera del promedio y por qué —
   incluida la razón de que una entidad aparezca en ⚪ «sin datos».

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/diagnostico (lib/auth):
   expone contenido del corpus. SOLO LEE; lo único que escribe es su caché.

   Lo que NO sale de aquí: adjudicatario y NIT del adjudicatario. Viven en el
   corpus histórico pero la proyección de la respuesta es una lista blanca
   (lib/competencia_detalle.proyectarProceso), igual que en /api/oportunidades.

   Caché: `indice:detalle:{entidad}` con TTL de 1 h para la vista de entidad y
   `indice:desglose_p:{id}` con TTL de 300 s para la del desglose. El valor
   guarda el sello de construcción del índice, así que reconstruirlo invalida
   todo al instante sin borrar clave por clave. `?refrescar=1` la salta.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { autorizarToken } = require("../lib/auth.js");
const { detalleEntidad } = require("../lib/competencia_detalle.js");
const { desgloseDeProceso } = require("../lib/probabilidad_desglose.js");

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[competencia-detalle]", ...a); };

/* El costo de preparación NO existe en ninguna fuente del proyecto: lo aporta
   quien consulta o no se usa. Un valor por defecto sería inventarse la cifra
   con la que se decide si vale la pena presentarse. */
function costoPreparacion(q) {
  if (q.costo_preparacion === undefined || String(q.costo_preparacion).trim() === "") return null;
  const n = Number(String(q.costo_preparacion).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  /* La vista se resuelve ANTES de autorizar y antes de tocar Redis: así una
     vista inventada no consume ni el token ni una lectura del corpus. Se lee
     de la query y del path como respaldo, igual que `accion` en
     api/apu/[accion].js: el rewrite trae `vista` en la query, pero un handler
     que solo funciona detrás del enrutador es un handler que no se puede
     probar. */
  const enRuta = /\/api\/probabilidad-desglose\b/.test(String(req.url || ""));
  const vista = String(q.vista || (enRuta ? "probabilidad" : "entidad")).toLowerCase();
  if (!["entidad", "probabilidad"].includes(vista)) {
    return res.status(400).json({
      ok: false,
      error: `vista «${vista}» desconocida`,
      vistas: ["entidad (por defecto) — ?entidad=…", "probabilidad — ?id_proceso=…"],
    });
  }

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
    const usarCache = q.refrescar !== "1";
    const { estado, cuerpo } = vista === "probabilidad"
      ? await desgloseDeProceso(redis, q.id_proceso, {
        usarCache, costoPreparacion: costoPreparacion(q), log: logDev,
      })
      : await detalleEntidad(redis, q.entidad, { usarCache, log: logDev });
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
