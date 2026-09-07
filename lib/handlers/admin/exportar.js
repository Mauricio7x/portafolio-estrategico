/* ============================================================================
   /api/admin?op=exportar · La copia de los datos del usuario, en un archivo
   ----------------------------------------------------------------------------
   GET /api/admin?op=exportar            (header x-historico-token, o &token=…
                                          para pegar la URL en Chrome)

   PROTEGIDO con el mismo HISTORICO_TOKEN (lib/auth): devuelve TODO lo que el
   usuario cargó a mano —su registro de proponente y perfiles, contratos
   ejecutados, consorcios, precios corregidos, borradores, procesos guardados y
   parámetros de costo—, y nada más: ninguna clave de `licitaciones:*`, de los
   índices ni del catálogo (se reconstruyen; lib/copia_datos es el censo).

   Responde el archivo como adjunto (`copia_detekta_AAAA-MM-DD.detekta`): un
   JSON comprimido con zlib. La cabecera `X-Copia-Elementos` dice cuántos
   elementos viajan para que la pantalla pueda avisar de una copia vacía sin
   descomprimir nada. SOLO LEE: un GET no escribe.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { exportarCopia, empaquetar, nombreArchivo } = require("../../copia_datos.js");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({ ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Método no permitido: la copia se descarga con GET. Para restaurarla use op=importar." });
  }

  const redis = crearRedis({});
  let copia;
  try {
    copia = await exportarCopia(redis);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudieron leer sus datos: ${e.message}`, que_hacer: "Vuelva a intentarlo en unos segundos." });
  }
  const archivo = empaquetar(copia);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo(copia.exportado_el)}"`);
  res.setHeader("Content-Length", String(archivo.length));
  res.setHeader("X-Copia-Elementos", String(copia.resumen.total));
  return res.status(200).send(archivo);
};
