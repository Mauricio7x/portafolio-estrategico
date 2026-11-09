/* lib/handlers/apu/accion · Qué acción pide una llamada a /api/apu (9-nov-2026)

   Una sola copia para los dos que la necesitan: el editor (que despacha por
   ella) y el router api/apu.js (cuya puerta tiene que evaluar la MISMA acción
   que se despacha: `?accion=` o, si falta, el último tramo del path, como
   `/api/apu/catalogo`). Vive aparte para que la puerta no dependa de cargar el
   editor (revisión adversaria del 9-nov-2026). */
"use strict";

function accionDe(req, q) {
  if (q && q.accion) return String(q.accion).toLowerCase();
  const ruta = String((req && req.url) || "").split("?")[0].replace(/\/+$/, "");
  return ruta.slice(ruta.lastIndexOf("/") + 1).toLowerCase();
}

module.exports = { accionDe };
