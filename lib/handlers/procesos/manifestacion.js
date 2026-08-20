/* lib/handlers/procesos/manifestacion.js · GET /api/procesos?op=manifestacion&estado=abierto|proximo
   ─────────────────────────────────────────────────────────────────────────────
   Las dos listas del bloque «Todavía puede avisar que le interesa». PÚBLICO
   (datos de SECOP II y del PAA). Lee la ventana precalculada
   (`manifestacion:ventana`, escrita con la portada) y RECALCULA los días
   hábiles restantes con la fecha de HOY en Colombia: la ventana se escribe
   con la sincronización, pero «le quedan 2 días» tiene que ser verdad en el
   momento de leerlo. Lo vencido desde entonces se retira. Cada fila lleva
   `origenFecha` y la advertencia de confirmar en el cronograma.

   20-ago-2026: ya no hay «vence el día X». La ley fija un MÁXIMO de 3 días
   hábiles, no un plazo, así que lo que viaja es la VENTANA (puede cerrar
   desde … a más tardar …) y el estado de tres valores. El refresco usa
   `estadoDeVentana` de lib/manifestacion —la misma función que construyó la
   fila—, no una segunda derivación. Ver la cabecera de ese módulo. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { leerManifestacion, NORMA, PLAZO_MANIFESTACION_HABILES, PLAZO_MINIMO_HABILES, MAX_MANIFESTACIONES_SIN_SORTEO, estadoDeVentana } = require("../../portada.js");
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
    ok: true, estado, norma: NORMA, plazoHabiles: PLAZO_MANIFESTACION_HABILES, plazoMinimoHabiles: PLAZO_MINIMO_HABILES, sorteoDesde: MAX_MANIFESTACIONES_SIN_SORTEO,
    como_leerlo: {
      abierto: "Procesos de selección abreviada de menor cuantía en los que todavía vale la pena avisar. La ley fija un MÁXIMO de 3 días hábiles desde la apertura, no un plazo fijo: la entidad pone el suyo en el pliego y suele ser menor, así que lo que se publica es la VENTANA en la que el plazo puede cerrar, no una fecha de vencimiento. Los marcados «por_confirmar» pueden haber cerrado ya: entre a SECOP II antes de contar con ellos.",
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
    const { estado: est, accion } = estadoDeVentana({ desde: f.puedeCerrarDesdeISO, hasta: f.venceMaximoISO, confirmada: f.fechaLimiteISO }, hoy);
    if (est === "vencida" || est === "sin_fecha") continue;          // lo vencido desde que se escribió la ventana se retira
    /* La cuenta atrás SOLO existe con fecha confirmada del cronograma; el
       resto es una cota para ordenar por urgencia, y se llama así. */
    const quedan = f.fechaLimiteISO ? habiles.habilesEntre(hoy, f.fechaLimiteISO) + (habiles.esHabil(hoy) ? 1 : 0) : null;
    const hastaElTecho = f.venceMaximoISO ? habiles.habilesEntre(hoy, f.venceMaximoISO) + (habiles.esHabil(hoy) ? 1 : 0) : null;
    vivos.push({ ...f, estado: est, accion, diasHabilesRestantes: quedan, habilesHastaElTecho: hastaElTecho });
  }
  vivos.sort((a, b) => (a.habilesHastaElTecho ?? 99) - (b.habilesHastaElTecho ?? 99) || (b.valor || 0) - (a.valor || 0));
  return res.status(200).json({ ...cabecera, disponible: true, generado: ventana.generado, hoy, resultados: vivos, total: vivos.length });
};
