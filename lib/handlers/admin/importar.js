/* ============================================================================
   /api/admin?op=importar · Restaurar los datos del usuario desde una copia
   ----------------------------------------------------------------------------
   POST /api/admin?op=importar   {copia: "<archivo en base64>", sobrescribir: false}

   PROTEGIDO con el mismo HISTORICO_TOKEN (lib/auth). El archivo es el que
   devuelve op=exportar; el cuerpo lo lee lib/cuerpo con tope de 4 MB (por
   debajo del tope de la plataforma, y un base64 de 4 MB son ~3 MB de zlib:
   muchas veces lo que pesa una configuración entera).

   La forma se valida ANTES de escribir nada (lib/copia_datos.validarCopia): un
   archivo que traiga una clave que no sea de usuario, un tipo que no cuadre o un
   valor mal formado se rechaza ENTERO con 400 y la lista de motivos. Lo que ya
   existe en la aplicación se salta y se dice, salvo `sobrescribir: true`, que
   es explícito y por clave. La respuesta dice qué se cargó y qué no con nombres
   de pantalla (`mensaje`, `que_hacer`, `apartados`); las claves van aparte, en
   `detalle`, para quien lee la respuesta cruda.

   Tras escribir el registro de proponente hace lo mismo que la carga del RUP:
   recarga los perfiles de ESTA instancia y borra las cachés que se calcularon
   contra el registro anterior (el sello ya hace recargar a las demás).
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES } = require("../../almacen.js");
const { restablecerPerfiles, invalidarCachePerfiles, recargarPerfiles } = require("../../perfiles.js");
const { desempaquetar, validarCopia, restaurarCopia, fraseDeRestauracion } = require("../../copia_datos.js");

const MAX_BYTES = 4 * 1024 * 1024;
const QUE_HACER_ARCHIVO = "Elija el archivo que descargó con «Descargar una copia de mis datos» en Mi empresa → Sistema → Copia de sus datos.";

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({ ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  if (String(req.method || "GET").toUpperCase() !== "POST") {
    /* Un GET no escribe: pegar esta URL en Chrome no puede restaurar nada solo. */
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "La restauración solo se hace por POST: un GET no escribe nada.",
      como_hacerlo: "Abra Mi empresa → Sistema → Copia de sus datos, elija el archivo y pulse «Restaurar».",
    });
  }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "copia" });
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }
  const datos = cuerpo.datos || {};
  if (typeof datos.copia !== "string" || !datos.copia.trim()) {
    return res.status(400).json({ ok: false, error: "Falta «copia»: el contenido del archivo descargado, en base64.", que_hacer: QUE_HACER_ARCHIVO });
  }
  const d = desempaquetar(Buffer.from(datos.copia.trim(), "base64"));
  if (!d.ok) return res.status(400).json({ ok: false, error: d.error, que_hacer: QUE_HACER_ARCHIVO });
  const v = validarCopia(d.copia);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      error: "El archivo no tiene la forma de una copia de Detekta: no se cargó nada.",
      errores: v.errores,
      que_hacer: QUE_HACER_ARCHIVO,
    });
  }

  const sobrescribir = datos.sobrescribir === true;
  const redis = crearRedis({});
  let r;
  try {
    r = await restaurarCopia(redis, d.copia, { sobrescribir });
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: `No se pudo terminar la restauración: ${e.message}`,
      que_hacer: "Vuelva a intentarlo en unos segundos. Lo que ya se había cargado no se pierde.",
      ...(e.parcial ? { parcial: e.parcial } : {}),
    });
  }

  /* ---------- efecto inmediato en esta instancia (el mismo gesto que la carga del RUP) ---------- */
  let cacheBorrada = 0;
  if (r.escritas.some((x) => /^config:(?:perfiles|unspsc)/.test(x.clave))) {
    try {
      restablecerPerfiles();
      invalidarCachePerfiles();
      await recargarPerfiles(redis, { forzar: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: `Restaurado, pero falló la recarga de perfiles: ${e.message}`, que_hacer: "Recargue la página; si persiste, vuelva a restaurar." });
    }
    try {
      const viejas = [...await redis.scan(CLAVES.patronResumen), ...await redis.scan(CLAVES.patronCobertura), ...await redis.scan(CLAVES.patronPulso)];
      if (viejas.length) { await redis.del(...viejas); cacheBorrada = viejas.length; }
    } catch { /* las cachés caducan solas: no valen un 500 */ }
  }

  const frase = fraseDeRestauracion(r);
  return res.status(200).json({
    ok: true,
    sobrescribir,
    exportado_el: d.copia.exportado_el || null,
    escritas: r.escritas.length,
    saltadas: r.saltadas.length,
    no_cargadas: r.no_cargadas.length,
    apartados: r.apartados,
    mensaje: frase.mensaje,
    que_hacer: frase.que_hacer,
    detalle: {
      escritas: r.escritas.map((x) => x.clave),
      saltadas: r.saltadas.map((x) => x.clave),
      no_cargadas: r.no_cargadas.map((x) => ({ clave: x.clave, motivo: x.motivo })),
    },
    cache_borrada: cacheBorrada,
  });
};
