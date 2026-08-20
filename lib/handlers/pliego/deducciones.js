/* /api/pliego?op=deducciones · Qué le van a descontar, leído del pliego
   ─────────────────────────────────────────────────────────────────────────────
   El margen de todo presupuesto viaja declarado como COTA SUPERIOR mientras
   `deducciones_pct` esté vacío, y ese bloque puede rondar el 10 % del valor —más
   que el margen típico de obra—. No hay tabla nacional de estampillas que copiar
   (las fija cada ordenanza y cambian por municipio) y el dueño no la tiene, así
   que el dato se lee de donde SIEMPRE está y además es vinculante: la cláusula
   de deducciones del pliego del proceso.

   El texto se toma del cuerpo o, con `id_proceso`, del que ya guardó el vigía de
   adendas — con `textoGuardado`, el MISMO lector que usa el cronograma: dos
   formas de conseguir el texto divergirían.

   Sin cláusula reconocible responde 200 con la lista vacía y el motivo, jamás un
   4xx: que un pliego no declare sus deducciones es un RESULTADO, no un error de
   la petición (la misma regla que «el pliego no traía tablas»). */
"use strict";

const { leerCuerpo } = require("../../cuerpo.js");
const { crearRedis, hayCredenciales } = require("../../redis.js");
const { leerDeducciones } = require("../../deducciones.js");
const { textoGuardado } = require("./cronograma.js");

const MAX_BYTES = 3 * 1024 * 1024;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Use GET con id_proceso o POST con el texto del pliego." });
  }

  let id = String(q.id_proceso || "").trim();
  let texto = "";
  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    id = String((cuerpo.datos && cuerpo.datos.id_proceso) || id).trim();
    texto = String((cuerpo.datos && cuerpo.datos.texto) || "");
  }
  if (!id && !texto) {
    return res.status(400).json({ ok: false, error: "Falta id_proceso o el texto del pliego." });
  }

  let version = null;
  if (!texto && id) {
    if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
    const t = await textoGuardado(crearRedis({}), id);
    texto = t.texto; version = t.version;
  }
  if (!texto) {
    return res.status(200).json({
      ok: true, id_proceso: id || null, hay_texto: false, conceptos: [],
      total_pct: null, total_aplicable_pct: null,
      motivo: "No hay texto de pliego para este proceso. Ábralo en el lector de pliegos y vuelva a consultar.",
    });
  }

  const r = leerDeducciones(texto);
  return res.status(200).json({
    ok: true, id_proceso: id || null, hay_texto: true, version_texto: version,
    ...r,
    /* Lo que hay que hacer con la cifra, dicho en la respuesta: `deducciones_pct`
       es el campo del editor, y lo que va ahí es el TOTAL APLICABLE — no el
       total leído, porque la contribución del 5 % y la retegarantía ya las
       modela el motor y sumarlas otra vez las cobraría dos veces. */
    como_usarlo: r.total_aplicable_pct == null
      ? "No se reconoció ninguna deducción: el margen seguirá siendo una cota superior hasta que la cargue a mano en Ajustes."
      : `Escriba ${r.total_aplicable_pct} % en «Deducciones» dentro de Ajustes, en Precios. Es el total LEÍDO menos lo que el `
        + "motor ya aplica solo (la contribución del 5 % y la retención de garantía): sumarlas otra vez las cobraría dos veces.",
  });
};
