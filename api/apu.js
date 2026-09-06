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

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.op && !q.accion) req.query = { ...q, accion: String(q.op).toLowerCase() };
  /* Un throw del editor responde JSON 500 con instrucción, no una promesa
     rechazada que la plataforma convierte en un 500 sin cuerpo (6-sep-2026). */
  try {
    return await require("../lib/handlers/apu/editor.js")(req, res);
  } catch (e) {
    return require("../lib/error_interno.js").responderErrorInterno(res, "apu", e);
  }
};
