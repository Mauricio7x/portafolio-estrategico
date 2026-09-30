/* /api/admin?op=espacio · QUÉ OCUPA LA BASE DE DATOS (30-sep-2026)

   Mide, sin escribir nada, cuánto ocupa cada familia de claves de Upstash
   (lib/espacio): del 28 al 30-sep-2026 la base pasó del tope del plan gratuito y
   rechazó toda escritura, y qué la llenaba solo lo enseñaba la consola de Upstash.
     GET /api/admin?op=espacio            (header x-historico-token, o &token=…
                                           para pegar la URL en Chrome)
   Protegido con la llave de la aplicación: los nombres de las claves llevan
   perfiles, NIT y procesos guardados. SOLO LEE. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { medirEspacio } = require("../../espacio.js");

/* el tope del plan gratuito de Upstash, leído en upstash.com/pricing/redis el
   30-sep-2026 («Max data size: 256 MB»); es el que Upstash citó en el error
   («Threshold: 268435456 bytes») */
const TOPE_PLAN_GRATUITO_BYTES = 268435456;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({ ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  }
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Use GET: el espacio solo se consulta." });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  let medida;
  try {
    medida = await medirEspacio(crearRedis({}));
  } catch (e) {
    const { tacharClave } = require("../../apu_ocr.js");
    return res.status(502).json({ ok: false, error: `No se pudo medir la base de datos: ${tacharClave(String((e && e.message) || e)).slice(0, 200)}`,
      que_hacer: "Vuelva a pegar esta misma dirección en unos minutos." });
  }
  const mb = (b) => (b == null ? null : Math.round((b / 1048576) * 10) / 10);
  return res.status(200).json({
    ok: true,
    ...medida,
    total_mb: mb(medida.bytes_total),
    tope_plan_gratuito_mb: mb(TOPE_PLAN_GRATUITO_BYTES),
    familias: medida.familias.map((f) => ({ ...f, mb: mb(f.bytes) })),
    como_leerlo: "Cada fila es una familia de datos guardados, de la que más pesa a la que menos. «mb» es su tamaño en megas; "
      + "«estimado: true» quiere decir que se midió una muestra y se multiplicó por el número de claves. «si_se_borra» dice qué pasa si se "
      + "libera. El total es de los datos, no de la memoria que Upstash reserva por dentro: sirve para ver qué pesa; la cifra que manda es la de Upstash.",
  });
};

module.exports.TOPE_PLAN_GRATUITO_BYTES = TOPE_PLAN_GRATUITO_BYTES;
