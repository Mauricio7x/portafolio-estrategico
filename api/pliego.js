/* /api/pliego · Router del dominio PLIEGO (Fase 0 · consolidación a 6 funciones)

   El lector de pliegos: `extraer-texto` (el texto con columnas por TAB que
   manda el navegador → filas del Formulario de cantidades; alias `parsear`)
   y `descargar` (el proxy SSRF-endurecido que baja el PDF que el navegador
   no puede por CORS). La lógica vive donde siempre —lib/apu_extraer.js y
   lib/apu_descargar.js, con su token y sus cerraduras dentro— y las URL
   viejas /api/apu/extraer-texto y /api/apu/descargar se reescriben aquí.

   Ninguna de las dos toca Redis: ni corpus, ni candados. Eso no cambia. */

const OPS = {
  "extraer-texto": () => require("../lib/apu_extraer.js"),
  parsear: () => require("../lib/apu_extraer.js"),
  descargar: () => require("../lib/apu_descargar.js"),
  formulario1: () => require("../lib/handlers/pliego/formulario1.js"), // [v3-F4] guardián del Formulario 1
  diff: () => require("../lib/handlers/pliego/diff.js"),               // [v3-F5] vigía de adendas (texto del pliego)
  cronograma: () => require("../lib/handlers/pliego/cronograma.js"),   // [v3-F5] hitos y avisos T-7/T-3/T-1 (+ .ics)
  deducciones: () => require("../lib/handlers/pliego/deducciones.js"), // qué le descuentan de cada pago, leído de la cláusula del pliego
  dictamen: () => require("../lib/handlers/pliego/dictamen.js"),       // el pliego guardado, leído por un modelo, con citas verificadas por página
  documentos: () => require("../lib/handlers/pliego/documentos.js"),   // los documentos del proceso (índice de datos.gov.co), leídos solos al guardar en Mis procesos
};

function opDe(req) {
  const q = req.query || {};
  if (q.op) return String(q.op).toLowerCase();
  const m = String(req.url || "").match(/\/api\/pliego\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

module.exports = async function handler(req, res) {
  const op = opDe(req);
  if (!op) {
    return res.status(400).json({
      ok: false,
      error: "Falta la operación: /api/pliego?op=…",
      operaciones: Object.keys(OPS),
    });
  }
  // `hasOwnProperty`: `?op=constructor` resolvía por el prototipo y tumbaba la
  // función con un 500 en vez de responder 404 (la regla que ya aplican listar,
  // resumen, diagnostico y consorcio a sus mapas).
  const h = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
  if (!h) {
    return res.status(404).json({
      ok: false,
      error: `Operación «${op}» desconocida.`,
      operaciones: Object.keys(OPS),
    });
  }
  /* Un throw del handler responde JSON 500 con instrucción, no una promesa
     rechazada que la plataforma convierte en un 500 sin cuerpo (6-sep-2026).
     Una sola copia del texto en lib/error_interno; el router sigue sin lógica. */
  try {
    return await h()(req, res);
  } catch (e) {
    return require("../lib/error_interno.js").responderErrorInterno(res, "pliego", e);
  }
};
