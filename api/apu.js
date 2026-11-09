/* /api/apu · Router del dominio APU (Fase 0 · consolidación a 6 funciones)

   Delega TODO en el editor (lib/handlers/apu/editor.js, el antiguo
   api/apu/[accion].js), que ya era un router por `accion` con su propio
   contrato probado: `catalogo` público, las demás con token, métodos
   exigidos por acción y 404 con la lista ante una acción desconocida.

   Las URL viejas `/api/apu/<accion>` llegan por rewrite como
   `?accion=<accion>`; `op` se acepta como sinónimo para la superficie
   nueva. El lector de pliegos (`extraer-texto`, `descargar`) tiene además
   su propio dominio en /api/pliego — aquí se conservan por compatibilidad
   con los enlaces viejos, delegando a los mismos módulos de lib/. */

async function despachar(req, res) {
  const q = req.query || {};
  if (q.op && !q.accion) req.query = { ...q, accion: String(q.op).toLowerCase() };
  /* LA PUERTA (9-nov-2026): sin la sesión ni la llave no pasa nada, salvo el
     censo declarado en lib/auth (entrar, salir y las tareas programadas). */
  // la MISMA acción que despacha el editor (query o, si falta, el path): revisión adversaria
  const accion = require("../lib/handlers/apu/accion.js").accionDe(req, req.query || {});
  require("../lib/medidor_redis.js").etiquetar(`apu:${accion}`);   // la medición del ancho de banda
  const puerta = await require("../lib/auth.js").autorizarPuerta(req, "apu", accion);
  if (!puerta.ok) return require("../lib/auth.js").responderPuerta(res, puerta);
  /* Un throw del editor responde JSON 500 con instrucción, no una promesa
     rechazada que la plataforma convierte en un 500 sin cuerpo (6-sep-2026). */
  try {
    return await require("../lib/handlers/apu/editor.js")(req, require("../lib/error_interno.js").conLlavesTachadas(res));
  } catch (e) {
    return require("../lib/error_interno.js").responderErrorInterno(res, "apu", e);
  }
};

/* Cada petición se mide (lib/medidor_redis); apagado fuera de Vercel. */
module.exports = (req, res) => require("../lib/medidor_redis.js").medir("apu", () => despachar(req, res));
