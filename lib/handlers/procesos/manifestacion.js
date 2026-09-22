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
const { leerManifestacion, NORMA, PLAZO_MANIFESTACION_HABILES, PLAZO_MINIMO_HABILES, MAX_MANIFESTACIONES_SIN_SORTEO, estadoDeVentana, noConstaVencida } = require("../../portada.js");
const { aplicarSenalSecop } = require("../../manifestacion.js");
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
      abierto: "Procesos de selección abreviada de menor cuantía en los que NO consta que el plazo para avisar haya vencido. La ley fija un MÁXIMO de 3 días hábiles desde la apertura, no un plazo fijo: la entidad pone el suyo en el pliego y suele ser menor, así que lo que se publica es la VENTANA en la que el plazo puede cerrar, no una fecha de vencimiento. Solo se retiran los procesos en los que CONSTA que el plazo pasó: fecha límite publicada y vencida, o fase publicada por SECOP II ya posterior a la manifestación (o la manifestación en evaluación); los demás se quedan a la vista —incluidos los que todavía no abren (`por_abrir`)— y hay que confirmarlos en SECOP II antes de contar con ellos.",
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
  /* `sin_vencer` desde el 15-sep-2026; `abiertos` es el nombre que escribía la
     versión anterior y se sigue leyendo para no exigir una reconstrucción. */
  for (const f of ventana.sin_vencer || ventana.abiertos || []) {
    /* LA SEÑAL PUBLICADA SE VUELVE A APLICAR (22-sep-2026). Aquí se recalculaba la
       ventana a secas y se PERDÍA lo que SECOP II había dicho de la fila: una
       guardada como `por_confirmar` (recibiendo) se servía como `pudo_vencer`, y
       una `por_abrir` (la fase anterior) como si el plazo hubiera podido pasar.
       Es la misma función que construyó la fila: una sola derivación. Una fila
       escrita por la versión anterior no trae `secopPosicion` y se comporta como
       antes (desplegar no exige reconstruir la ventana). */
    const ventanaHoy = estadoDeVentana({ desde: f.puedeCerrarDesdeISO, hasta: f.venceMaximoISO, confirmada: f.fechaLimiteISO, horaLimite: f.horaLimite || null }, hoy, habiles.ahoraColombia(Date.now()));
    const { estado: est, accion } = aplicarSenalSecop(ventanaHoy, { recibiendo: f.secopRecibia, fecha: f.secopFecha, posicion: f.secopPosicion || null }, { confirmada: f.fechaLimiteISO });
    /* Se retira solo lo que CONSTA vencido desde que se escribió la ventana: el
       mismo predicado de lo que se esconde en el listado, una sola definición. */
    if (!noConstaVencida({ estado: est })) continue;
    /* La cuenta atrás SOLO existe con fecha confirmada del cronograma; el
       resto es una cota para ordenar por urgencia, y se llama así. */
    const quedan = f.fechaLimiteISO ? habiles.habilesEntre(hoy, f.fechaLimiteISO) + (habiles.esHabil(hoy) ? 1 : 0) : null;
    /* ⚠️ `hoy <= venceMaximoISO`, COMO EN EL MÓDULO (15-sep-2026). Aquí faltaba
       la guarda que `lib/manifestacion.filaManifestacion` sí tiene, y
       `habilesEntre` devuelve 0 cuando la fecha ya pasó: un proceso cuyo techo
       venció en enero salía con «1 día hasta el techo» y, como esta lista ordena
       por esa cota, se ponía POR DELANTE del que de verdad está cerrando hoy.
       No se notaba mientras lo pasado se retiraba de la lista; en cuanto
       `pudo_vencer` se quedó a la vista, saltó. Dos derivaciones de la misma
       cota divergen: esta vuelve a ser la del módulo. */
    const hastaElTecho = f.venceMaximoISO && hoy <= f.venceMaximoISO ? habiles.habilesEntre(hoy, f.venceMaximoISO) + (habiles.esHabil(hoy) ? 1 : 0) : null;
    vivos.push({ ...f, estado: est, accion, diasHabilesRestantes: quedan, habilesHastaElTecho: hastaElTecho });
  }
  vivos.sort((a, b) => (a.habilesHastaElTecho ?? 99) - (b.habilesHastaElTecho ?? 99) || (b.valor || 0) - (a.valor || 0));
  return res.status(200).json({ ...cabecera, disponible: true, generado: ventana.generado, hoy, resultados: vivos, total: vivos.length });
};
