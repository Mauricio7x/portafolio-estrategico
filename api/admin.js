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
  const m = String(req.url || "").match(/\/api\/admin\/([a-z0-9-]+)/i);
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
  // `hasOwnProperty`, no `OPS[op]`: `?op=constructor` resuelve por el PROTOTIPO
  // (`Object`, que es truthy), la guarda de abajo no dispara y la llamada revienta
  // con un 500 sin cuerpo en vez del 404 de operación desconocida.
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
    return require("../lib/error_interno.js").responderErrorInterno(res, "admin", e);
  }
};
