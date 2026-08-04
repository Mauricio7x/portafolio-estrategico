/* ============================================================================
   /api/apu/catalogo · El catálogo de precios APU, en abierto
   ----------------------------------------------------------------------------
   GET /api/apu/catalogo                    → ítems + insumos + regiones
   GET /api/apu/catalogo?insumo=cemento_gris_50kg   → los precios de UN insumo
   GET /api/apu/catalogo?region=costa_atlantica     → los factores de UNA región
   GET /api/apu/catalogo?bloque=items|insumos|regiones → solo ese bloque

   SIN TOKEN, a propósito y sin excepción a la regla del proyecto. La regla es
   que no salen sin llave las CIFRAS DEL PERFIL —patrimonio, K, CRPC, tope—,
   porque son datos financieros de personas identificadas. Aquí no hay nada de
   eso: son precios de mercado de referencia, los mismos que publica cualquier
   revista de construcción. Lo que sí exige llave es ESCRIBIRLOS
   (/api/admin/apu/cargar-catalogo).

   El catálogo cambia cuando alguien lo recarga a mano, así que se puede cachear
   en el borde; el sello de versión viaja en la respuesta para que un cliente
   sepa si lo que tiene sigue vigente.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const {
  obtenerCatalogo, obtenerItems, obtenerPreciosInsumo, obtenerFactoresRegion,
} = require("../../lib/apu/catalogo.js");

const AVISO = "Precios de REFERENCIA regionalizada, no cotizaciones. Verifique contra cotización real "
  + "antes de presentar oferta. El costo directo NO incluye AIU ni los costos ocultos "
  + "(contribución del 5 %, estampillas, pólizas, financiación): ver docs/APU_Y_RENTABILIDAD.md.";

const NO_CARGADO = {
  ok: false,
  cargado: false,
  error: "El catálogo APU no está cargado en Redis.",
  siguiente_paso: "Un administrador debe llamar POST /api/admin/apu/cargar-catalogo con el token, "
    + "o pulsar «Cargar catálogo APU» en /admin.html.",
};

module.exports = async function handler(req, res) {
  const q = req.query || {};
  // el catálogo solo cambia cuando alguien lo recarga: cachear es correcto
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");

  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});

  try {
    /* ---- un insumo suelto ---- */
    if (q.insumo) {
      const i = await obtenerPreciosInsumo(redis, q.insumo);
      if (!i) {
        return res.status(404).json({
          ok: false,
          error: `No existe el insumo «${q.insumo}» en el catálogo cargado.`,
          nota: "Consulte GET /api/apu/catalogo?bloque=insumos para ver los identificadores disponibles.",
        });
      }
      return res.status(200).json({ ok: true, insumo: i, aviso: AVISO });
    }

    /* ---- una región suelta ---- */
    if (q.region) {
      const r = await obtenerFactoresRegion(redis, q.region);
      if (!r) {
        return res.status(404).json({
          ok: false,
          error: `No existe la región «${q.region}» en el catálogo cargado.`,
          nota: "Consulte GET /api/apu/catalogo?bloque=regiones para ver las regiones disponibles.",
        });
      }
      return res.status(200).json({ ok: true, region: r, aviso: AVISO });
    }

    /* ---- solo los ítems (el bloque que más se pide) ---- */
    if (String(q.bloque || "") === "items") {
      const { items, via, version } = await obtenerItems(redis);
      if (!version && !items.length) return res.status(503).json(NO_CARGADO);
      return res.status(200).json({ ok: true, cargado: true, version, via, total: items.length, items, aviso: AVISO });
    }

    /* ---- el catálogo entero ---- */
    const c = await obtenerCatalogo(redis);
    if (!c.cargado) return res.status(503).json(NO_CARGADO);

    const bloque = String(q.bloque || "");
    const salida = {
      ok: true,
      cargado: true,
      version: c.meta.version,
      version_catalogo: c.meta.version_catalogo,
      cargado_el: c.meta.cargado_el,
      base_precios: c.meta.base_precios,
      region_base: c.meta.region_base,
      icociv: c.meta.icociv,
      prestacional: c.meta.prestacional,
      via: c.via,
      totales: { insumos: c.insumos.length, items: c.items.length, regiones: c.regiones.length },
      aviso: AVISO,
    };
    // los tres bloques van completos salvo que se pida uno; el resto se omite,
    // nunca se manda vacío (un [] diría «no hay», que es otra cosa)
    if (!bloque || bloque === "regiones") salida.regiones = c.regiones;
    if (!bloque || bloque === "insumos") salida.insumos = c.insumos;
    if (!bloque || bloque === "items") salida.items = c.items;

    return res.status(200).json(salida);
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo leer el catálogo: ${e.message}` });
  }
};
