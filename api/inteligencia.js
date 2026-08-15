/* /api/inteligencia · Router del dominio INTELIGENCIA (Fase 0 · 6 funciones)

   Envuelve al antiguo /api/competencia-detalle, que ya era multi-vista:
   `entidad` (los procesos que sostienen el badge de competencia),
   `adjudicatario` (el perfil del competidor), `probabilidad` (el desglose
   justificado de P(ganar)) y `paa` (lo que va a salir antes de que salga).
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
};

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.op && !q.vista) {
    const vista = VISTA_POR_OP[String(q.op).toLowerCase()];
    /* Una op desconocida se deja pasar tal cual: el handler responde su 400
       con la lista de vistas, que es el contrato ya probado. */
    req.query = { ...q, vista: vista || String(q.op).toLowerCase() };
  }
  return require("../lib/handlers/inteligencia/detalle.js")(req, res);
};
