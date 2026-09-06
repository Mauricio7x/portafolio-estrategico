/* ============================================================================
   /api/admin/apu/cargar-catalogo · Puebla Redis con el catálogo de precios APU
   ----------------------------------------------------------------------------
   GET  /api/admin/apu/cargar-catalogo?token=…  → qué hay cargado hoy (no escribe)
   POST /api/admin/apu/cargar-catalogo?token=…  → valida y carga el catálogo
        …?forzar=true                           → reescribe aunque ya esté cargado

   PROTEGIDO con el mismo HISTORICO_TOKEN que el resto de /api/admin y de los
   endpoints de mantenimiento (lib/auth: header `x-historico-token` o `?token=`,
   el header manda si vienen los dos). Escribe ~70 claves de una vez, así que no
   puede quedar expuesto: es la única forma de que alguien reescriba los precios
   con los que se decide a qué presentarse.

   POR QUÉ ESCRIBE Y NO SIRVE. La consulta del catálogo es pública
   (/api/apu/catalogo): no hay en él ningún dato del dueño, solo precios de
   mercado de referencia. Lo que exige llave es MODIFICARLOS.

   NO requiere full ni backfill, y no toca el corpus: el catálogo vive en
   `apu:*`, fuera de `licitaciones:*`, igual que el RUP y la experiencia.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { cargarCatalogo, leerMeta, SEMILLA } = require("../../apu/catalogo.js");

const boolean = (v) => v === true || v === "true" || v === "1";

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }

  const metodo = String(req.method || "GET").toUpperCase();
  const redis = crearRedis({});

  /* ══════════════════ GET · qué hay cargado ══════════════════ */
  if (metodo === "GET") {
    let meta = null;
    try {
      meta = await leerMeta(redis);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer el estado del catálogo: ${e.message}` });
    }
    if (!meta) {
      return res.status(200).json({
        ok: true, cargado: false,
        disponible_en_semilla: {
          version: SEMILLA._meta.version,
          insumos: SEMILLA.insumos.length,
          items: SEMILLA.items.length,
          regiones: SEMILLA.regiones.length,
        },
        mensaje: "El catálogo APU no está cargado en Redis. Pulse «Cargar catálogo APU» para poblarlo.",
      });
    }
    return res.status(200).json({
      ok: true, cargado: true, ...meta,
      version_semilla: SEMILLA._meta.version,
      desactualizado: meta.version_catalogo !== SEMILLA._meta.version,
    });
  }

  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use GET para consultar y POST para cargar." });
  }

  /* ══════════════════ POST · cargar ══════════════════ */
  let r = null;
  try {
    r = await cargarCatalogo(redis, { forzar: boolean(q.forzar) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo cargar el catálogo. Reintente. (${e.message})` });
  }

  // un catálogo inválido es un 400 con el campo exacto señalado, igual que el
  // POST del RUP: y no se escribió nada
  if (!r.ok) return res.status(400).json({ ok: false, error: r.error, errores: r.errores });

  return res.status(200).json({
    ...r,
    comandos_redis: redis.comandos(),
    nota: r.escrito
      ? "Catálogo APU cargado. Los precios son de REFERENCIA: cotice antes de presentar oferta."
      : r.nota,
  });
};
