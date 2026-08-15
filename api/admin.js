/* /api/admin · Router del dominio ADMIN (Fase 0 · consolidación a 6 funciones)

   Las escrituras de configuración: `rup` (carga/borrado de RUP, incluido el
   onboarding por PDF con `?origen=pdf` — era /api/admin/rup), `experiencia`
   (contratos ejecutados, con `?origen=repositorio` para la carga sin cuerpo
   — era /api/admin/experiencia), `cobertura` (la auditoría de códigos que
   faltan en el RUP — era /api/admin/cobertura-rup) y `cargar-catalogo` (el
   catálogo de precios APU — era /api/admin/apu/cargar-catalogo).

   La autorización sigue viviendo en cada handler (lib/auth una sola vez), y
   la única escritura sin token del repositorio —el RUP por PDF del
   onboarding— conserva exactamente sus cerraduras: están en el handler, no
   en la ruta. */

const OPS = {
  rup: () => require("../lib/handlers/admin/rup.js"),
  experiencia: () => require("../lib/handlers/admin/experiencia.js"),
  cobertura: () => require("../lib/handlers/admin/cobertura.js"),
  "cargar-catalogo": () => require("../lib/handlers/admin/cargar_catalogo.js"),
};

function opDe(req) {
  const q = req.query || {};
  if (q.op) return String(q.op).toLowerCase();
  const m = String(req.url || "").match(/\/api\/admin\/([a-z-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

module.exports = async function handler(req, res) {
  const op = opDe(req);
  if (!op) {
    return res.status(400).json({
      ok: false,
      error: "Falta la operación: /api/admin?op=…",
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
