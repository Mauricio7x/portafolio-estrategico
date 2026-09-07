/* /api/inteligencia · Router del dominio INTELIGENCIA (Fase 0 · 6 funciones)

   Envuelve al antiguo /api/competencia-detalle, que ya era multi-vista:
   `entidad` (los procesos que sostienen el badge de competencia),
   `adjudicatario` (el perfil del competidor), `probabilidad` (el desglose
   justificado de P(ganar)), `paa` (lo que va a salir antes de que salga) y
   `socio` (la due diligence de 20 minutos antes de firmar un consorcio).
   Todas responden la misma pregunta —«¿de dónde sale ese dato de la
   tarjeta?»— y por eso viven juntas.

   El handler sigue leyendo `vista` (su contrato de siempre, y el que traen
   los rewrites de las URL viejas). `op` se acepta como sinónimo para la
   superficie nueva, con `competidor` como alias de `adjudicatario` — es la
   palabra del glosario del producto; el nombre interno no se renombra
   porque media suite y el frontend lo usan. */

const VISTA_POR_OP = {
  entidad: "entidad",
  competidor: "adjudicatario",
  adjudicatario: "adjudicatario",
  probabilidad: "probabilidad",
  paa: "paa",
  socio: "socio",
};

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.op && !q.vista) {
    /* `hasOwnProperty` como en los otros cinco routers: sin él, `?op=constructor`
       resolvía por el prototipo (sin bypass — el handler revalida con 400 —,
       pero un router no debe resolver claves que no declaró). */
    const k = String(q.op).toLowerCase();
    const vista = Object.prototype.hasOwnProperty.call(VISTA_POR_OP, k) ? VISTA_POR_OP[k] : undefined;
    /* Una op desconocida se deja pasar tal cual: el handler responde su 400
       con la lista de vistas, que es el contrato ya probado. */
    req.query = { ...q, vista: vista || String(q.op).toLowerCase() };
  }
  /* Un throw del handler responde JSON 500 con instrucción, no una promesa
     rechazada que la plataforma convierte en un 500 sin cuerpo (6-sep-2026). */
  try {
    return await require("../lib/handlers/inteligencia/detalle.js")(req, res);
  } catch (e) {
    return require("../lib/error_interno.js").responderErrorInterno(res, "inteligencia", e);
  }
};
