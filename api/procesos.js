/* /api/procesos · Router del dominio PROCESOS (Fase 0 · consolidación a 6 funciones)

   El plan Hobby de Vercel admite 12 funciones y el repositorio estaba
   exactamente en 12: cada endpoint nuevo obligaba a plegar otro. La
   consolidación deja SEIS routers por dominio (procesos, inteligencia,
   perfil, admin, apu, pliego) que despachan por `?op=` a los handlers de
   `lib/handlers/{dominio}/`, donde vive la lógica intacta — los archivos
   son los mismos que eran funciones sueltas, movidos sin reescribirlos.

   Las URL viejas (`/api/sync`, `/api/oportunidades`, …) siguen respondiendo
   igual: `vercel.json` las reescribe a `?op=…` y la query del visitante se
   FUSIONA con la del destino (comportamiento ya verificado en producción por
   los alias `/api/paa?medir=1` y compañía). Desde ago 2026 el frontend y las
   auto-invocaciones del servidor llaman a las rutas canónicas
   (`/api/{router}?op=…`, prueba j.12-ter): los rewrites quedan como capa de
   COMPATIBILIDAD para las URL que el dueño tiene pegadas en Chrome, la
   documentación y el cron — nada interno depende de ellos.

   `op` se lee de la query Y del path como respaldo (`/api/procesos/sync`),
   igual que `accion` en el editor de APU: un handler que solo funciona
   detrás del enrutador es un handler que no se puede probar.

   Los `require` van DIFERIDOS por operación: servir el listado no puede
   pagar la carga del módulo de sincronización, y viceversa. La autorización
   NO vive aquí: cada handler conserva la suya (historico exige token, sync
   tiene sus modos, el listado lo tiene opcional) — un router que autorizara
   por su cuenta sería una segunda copia de lib/auth que se desincroniza. */

const OPS = {
  sync: () => require("../lib/handlers/procesos/sync.js"),           // era /api/sync
  historico: () => require("../lib/handlers/procesos/historico.js"), // era /api/sync/historico
  listar: () => require("../lib/handlers/procesos/listar.js"),       // era /api/oportunidades
  baja: () => require("../lib/handlers/procesos/baja.js"),           // era /api/indice-baja
  entidades: () => require("../lib/handlers/procesos/entidades.js"), // [v4] Fase 8 · buscador de entidades
  portada: () => require("../lib/handlers/procesos/portada.js"),     // [v4] Fase 9 · el pulso del mercado (público)
  manifestacion: () => require("../lib/handlers/procesos/manifestacion.js"), // [v4] Fase 9 · avisar que le interesa
};

function opDe(req) {
  const q = req.query || {};
  if (q.op) return String(q.op).toLowerCase();
  const m = String(req.url || "").match(/\/api\/procesos\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

module.exports = async function handler(req, res) {
  const op = opDe(req);
  if (!op) {
    return res.status(400).json({
      ok: false,
      error: "Falta la operación: /api/procesos?op=…",
      operaciones: Object.keys(OPS),
    });
  }
  // `hasOwnProperty`: `?op=constructor` resolvía por el prototipo y tumbaba la
  // función con un 500 en vez de responder 404.
  const h = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
  if (!h) {
    return res.status(404).json({
      ok: false,
      error: `Operación «${op}» desconocida.`,
      operaciones: Object.keys(OPS),
    });
  }
  return h()(req, res);
};
