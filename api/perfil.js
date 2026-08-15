/* /api/perfil · Router del dominio PERFIL (Fase 0 · consolidación a 6 funciones)

   Lo que describe la relación entre EL PERFIL del usuario y el corpus:
   `resumen` (el tablero: totales, destacados, repartos — era /api/resumen)
   y `diagnostico` (el embudo paso a paso con contrafactuales — era
   /api/diagnostico). Los dos exigen token en su handler; el router no
   autoriza por su cuenta (sería una copia de lib/auth que se desincroniza). */

const OPS = {
  resumen: () => require("../lib/handlers/perfil/resumen.js"),         // era /api/resumen
  diagnostico: () => require("../lib/handlers/perfil/diagnostico.js"), // era /api/diagnostico
};

function opDe(req) {
  const q = req.query || {};
  if (q.op) return String(q.op).toLowerCase();
  const m = String(req.url || "").match(/\/api\/perfil\/([a-z-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

module.exports = async function handler(req, res) {
  const op = opDe(req);
  if (!op) {
    return res.status(400).json({
      ok: false,
      error: "Falta la operación: /api/perfil?op=…",
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
