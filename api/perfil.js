/* /api/perfil · Router del dominio PERFIL (Fase 0 · consolidación a 6 funciones)

   Lo que describe la relación entre EL PERFIL del usuario y el corpus:
   `resumen` (el tablero: totales, destacados, repartos — era /api/resumen)
   y `diagnostico` (el embudo paso a paso con contrafactuales — era
   /api/diagnostico). Los dos exigen token en su handler; el router no
   autoriza por su cuenta (sería una copia de lib/auth que se desincroniza). */

const OPS = {
  resumen: () => require("../lib/handlers/perfil/resumen.js"),         // era /api/resumen
  diagnostico: () => require("../lib/handlers/perfil/diagnostico.js"), // era /api/diagnostico (GET, embudo)
  /* Fase 2 · la PUERTA DE ENTRADA: `POST /api/perfil?op=diagnostico` es el
     contrato literal del plan maestro (diagnóstico anónimo del RUP: cuenta a
     cuántas licitaciones se puede presentar). Comparte nombre con el embudo
     de siempre porque el plan lo fija así; se separan por MÉTODO —el embudo
     es GET con token, la entrada es POST pública— y `entrada` queda como
     sinónimo explícito para quien prefiera no ambigüedad. */
  entrada: () => require("../lib/handlers/perfil/entrada.js"),
  /* El PULSO personalizado (ago 2026): las cifras del perfil nada más entrar
     — cuántas, cuánto dinero, cuáles cierran esta semana, dónde y quién.
     Público como la entrada (conteos de procesos públicos, sin cifras del
     perfil); GET ?perfil=… */
  pulso: () => require("../lib/handlers/perfil/pulso.js"),
  // [v4] Fase 10 · consorcio a la medida (crear/listar/borrar) y su simulador
  consorcio: () => require("../lib/handlers/perfil/consorcio.js"),
  "consorcio-simular": () => (req, res) => require("../lib/handlers/perfil/consorcio.js")(req, res, { op: "consorcio-simular" }),
  // MIS PROCESOS (ago 2026): guardar, seguir (hitos y avisos) y estudiar a los proponentes; token
  seguimiento: () => require("../lib/handlers/perfil/seguimiento.js"),
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
  const esPost = String(req.method || "GET").toUpperCase() === "POST";
  const h = op === "diagnostico" && esPost ? OPS.entrada : OPS[op];
  if (!h) {
    return res.status(404).json({
      ok: false,
      error: `Operación «${op}» desconocida.`,
      operaciones: Object.keys(OPS),
    });
  }
  return h()(req, res);
};
