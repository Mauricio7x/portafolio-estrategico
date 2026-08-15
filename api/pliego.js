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
};

function opDe(req) {
  const q = req.query || {};
  if (q.op) return String(q.op).toLowerCase();
  const m = String(req.url || "").match(/\/api\/pliego\/([a-z-]+)/i);
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
  const h = OPS[op];
  if (!h) {
    return res.status(404).json({
      ok: false,
      error: `Operación «${op}» desconocida.`,
      operaciones: Object.keys(OPS),
    });
  }
  return h()(req, res);
};
