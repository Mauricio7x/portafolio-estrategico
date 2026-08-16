/* lib/handlers/procesos/manifestacion.js · GET /api/procesos?op=manifestacion&estado=abierto|proximo
   ─────────────────────────────────────────────────────────────────────────────
   Las dos listas del bloque «Todavía puede avisar que le interesa». PÚBLICO
   (datos de SECOP II y del PAA). Lee la ventana precalculada
   (`manifestacion:ventana`, escrita con la portada) y RECALCULA los días
   hábiles restantes con la fecha de HOY en Colombia: la ventana se escribe
   con la sincronización, pero «le quedan 2 días» tiene que ser verdad en el
   momento de leerlo. Lo vencido desde entonces se retira. Cada fila lleva
   `origenFecha` — hoy siempre «calculada» (apertura + 3 días hábiles, ver
   lib/portada) — y la advertencia de confirmar en el cronograma. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { leerManifestacion, NORMA, PLAZO_MANIFESTACION_HABILES, MAX_MANIFESTACIONES_SIN_SORTEO } = require("../../portada.js");
const habiles = require("../../habiles.js");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const estado = ["abierto", "proximo"].includes(String(q.estado || "")) ? String(q.estado) : "abierto";
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});
  let ventana;
  try { ventana = await leerManifestacion(redis); } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  const cabecera = {
    ok: true, estado, norma: NORMA, plazoHabiles: PLAZO_MANIFESTACION_HABILES, sorteoDesde: MAX_MANIFESTACIONES_SIN_SORTEO,
    como_leerlo: {
      abierto: "Procesos de selección abreviada de menor cuantía cuyo plazo para manifestar interés (apertura + 3 días hábiles) todavía no venció. La fecha es CALCULADA a partir de la publicación del proceso; confirme en el cronograma del SECOP II.",
      proximo: "Líneas del Plan Anual de Adquisiciones (dataset 9sue-ezhx): lo que la entidad PLANEA publicar. Un plan no es un compromiso.",
    },
  };
  if (!ventana) {
    return res.status(200).json({ ...cabecera, disponible: false, resultados: [], motivo: "La ventana de manifestación se calcula con cada sincronización y todavía no se ha calculado ninguna." });
  }
  if (estado === "proximo") {
    return res.status(200).json({ ...cabecera, disponible: ventana.proximos != null, generado: ventana.generado, resultados: ventana.proximos || [],
      ...(ventana.proximos == null ? { motivo: "El Plan Anual de Adquisiciones no respondió al construir la portada: sin referencia, no cero." } : {}) });
  }
  const hoy = habiles.hoyColombia(Date.now());
  const vivos = [];
  for (const f of ventana.abiertos || []) {
    if (!f.venceISO || hoy > f.venceISO) continue;
    const quedan = habiles.habilesEntre(hoy, f.venceISO) + (habiles.esHabil(hoy) ? 1 : 0);
    vivos.push({ ...f, diasHabilesRestantes: quedan });
  }
  vivos.sort((a, b) => a.diasHabilesRestantes - b.diasHabilesRestantes || (b.valor || 0) - (a.valor || 0));
  return res.status(200).json({ ...cabecera, disponible: true, generado: ventana.generado, hoy, resultados: vivos, total: vivos.length });
};
