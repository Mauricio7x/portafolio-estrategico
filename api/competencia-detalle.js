/* ============================================================================
   /api/competencia-detalle · Consultas de SOLO LECTURA sobre el mercado
   ----------------------------------------------------------------------------
   TRES VISTAS, una sola función serverless:

     GET /api/competencia-detalle?entidad=ALCALDÍA DE PURIFICACIÓN
         ¿CUÁLES son los procesos detrás del badge de competencia?
     GET /api/competencia-detalle?vista=probabilidad&id_proceso=CO1.REQ.123
         ¿POR QUÉ ese «Prob. estimada: 23 %»? — el desglose paso a paso.
         Alias público: /api/probabilidad-desglose (rewrite de vercel.json).
     GET /api/competencia-detalle?vista=paa[&entidad=…][&unspsc=72141000]
         ¿QUÉ VA A SALIR? — el Plan Anual de Adquisiciones de los próximos
         12 meses (dataset Socrata 9sue-ezhx, lib/paa).
         Alias público: /api/paa (rewrite de vercel.json).

     (token por header `x-historico-token` o por `?token=`)

   POR QUÉ VAN JUNTAS, que no es una decisión estética: el plan Hobby de Vercel
   admite 12 funciones por despliegue y el repositorio está EXACTAMENTE en 12
   (hay prueba que las cuenta). Un archivo más y no falla el endpoint nuevo:
   falla el despliegue entero. Es la misma restricción que plegó
   `/api/apu/catalogo` en `api/apu/[accion].js` y que impidió `/api/baja-mercado`.

   QUÉ COMPARTEN, dicho sin adornos. Las dos primeras responden la misma
   pregunta —«de dónde sale ese número de la tarjeta»— sobre el mismo corpus.
   La tercera NO: mira otro dataset, no toca Redis y habla de procesos que
   todavía no existen. Lo que las tres tienen en común es ser CONSULTAS DE SOLO
   LECTURA CON TOKEN que explican lo que el dueño ve en la pestaña de
   licitaciones, y ese es el alcance del archivo desde ago 2026. Conviene
   decirlo aquí en vez de dejar que un lector futuro deduzca que «detalle de
   competencia» alguna vez significó esto: el nombre del archivo se quedó corto
   y el tope de funciones es lo que impide arreglarlo.

   Las URLs literales `/api/probabilidad-desglose` y `/api/paa` existen como
   `rewrite` de vercel.json, que no cuenta como función. Hay prueba de que
   apuntan aquí CON su `vista`. El frontend llama a la CANÓNICA: si el rewrite
   fallara, el modal y el PAA tienen que seguir funcionando (misma lección que
   `/api/admin/cargar-experiencia-genesis`).

   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Sin poder ver esos 12, el promedio es una caja negra: no hay forma de saber
   si son procesos de obra civil o de cualquier otra cosa. Este endpoint los
   entrega, y entrega TAMBIÉN los que quedaron fuera del promedio y por qué —
   incluida la razón de que una entidad aparezca en ⚪ «sin datos».

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/diagnostico (lib/auth):
   expone contenido del corpus. SOLO LEE; lo único que escribe es su caché.

   Adjudicatarios (ago 2026): las FILAS siguen sin adjudicatario ni NIT — la
   proyección es una lista blanca (lib/competencia_detalle.proyectarProceso),
   igual que en /api/oportunidades—, pero la vista de entidad SÍ publica el
   AGREGADO «quién gana aquí» (top de ganadores, concentración y su lectura):
   es la señal #11 del manual hecha dato, es información pública de SECOP y
   este endpoint exige token. Decisión deliberada, con prueba de las dos
   mitades.

   Caché: `indice:detalle:{entidad}` con TTL de 1 h para la vista de entidad y
   `indice:desglose_p:{id}` con TTL de 300 s para la del desglose. El valor
   guarda el sello de construcción del índice, así que reconstruirlo invalida
   todo al instante sin borrar clave por clave. `?refrescar=1` la salta.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { autorizarToken } = require("../lib/auth.js");
const { detalleEntidad, detalleAdjudicatario } = require("../lib/competencia_detalle.js");
const { desgloseDeProceso } = require("../lib/probabilidad_desglose.js");
const { consultarPaa } = require("../lib/paa.js");
const { medirAciertoPaa, leerAciertoPaa } = require("../lib/paa_acierto.js");

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
  const url = String(req.url || "");
  const enRuta = /\/api\/probabilidad-desglose\b/.test(url) ? "probabilidad"
    : /\/api\/paa\b/.test(url) ? "paa" : null;
  const vista = String(q.vista || enRuta || "entidad").toLowerCase();
  if (!["entidad", "probabilidad", "paa", "adjudicatario"].includes(vista)) {
    return res.status(400).json({
      ok: false,
      error: `vista «${vista}» desconocida`,
      vistas: ["entidad (por defecto) — ?entidad=…", "probabilidad — ?id_proceso=…",
        "paa — [?entidad=…][&unspsc=…]", "adjudicatario — ?adjudicatario=<clave del top>"],
    });
  }

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false, error: permiso.error,
      ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
    });
  }

  /* El PAA sale AQUÍ, antes del chequeo duro de Upstash: la consulta vive en
     otro dataset de Socrata, no lee el corpus y no toma candados. Desde ago
     2026 hay DOS matices, los dos deliberados:
     · `?medir=1` SÍ exige Redis (cruza el PAA de una vigencia cerrada contra
       el corpus y guarda `paa:acierto`): es la única escritura de la vista y
       lo dice su 503.
     · la consulta normal LEE `paa:acierto` best-effort — un Redis caído
       devuelve null dentro de `leerAciertoPaa` y la vista sirve igual, con la
       tasa sin medir. La garantía que importa (una avería de Redis no tumba
       el PAA) se conserva. */
  if (vista === "paa") {
    if (q.medir === "1") {
      if (!hayCredenciales()) {
        return res.status(503).json({ ok: false, error: "Medir la tasa de acierto exige credenciales de Upstash Redis (cruza el PAA contra el corpus)." });
      }
      let redisMedir;
      try { redisMedir = crearRedis({}); }
      catch (e) { return res.status(503).json({ ok: false, error: `Servicio de caché no disponible: ${e.message}` }); }
      const anio = q.anio && String(q.anio).trim() !== "" ? Number(q.anio) : undefined;
      const { estado, cuerpo } = await medirAciertoPaa(redisMedir, { anio, log: logDev });
      return res.status(estado).json(cuerpo);
    }
    let acierto = null;
    if (hayCredenciales()) {
      try { acierto = await leerAciertoPaa(crearRedis({})); } catch { acierto = null; }
    }
    const { estado, cuerpo } = await consultarPaa({ entidad: q.entidad, unspsc: q.unspsc, log: logDev, acierto });
    return res.status(estado).json(cuerpo);
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
      : vista === "adjudicatario"
        ? await detalleAdjudicatario(redis, q.adjudicatario, { usarCache, log: logDev })
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
