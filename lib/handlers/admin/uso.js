/* /api/admin?op=uso · CUÁNTO SE USA DETEKTA, POR PERFIL (27-sep-2026)

   Lee lo que cuenta lib/uso: por perfil y mes, cuántas veces se consultó la
   lista, se guardó un proceso, se marcó «Me presenté», se anotó la oferta, se
   consultó un dictamen, se calculó un precio y se revisó una oferta; y, de lo
   que Mis procesos ya guarda, cuántos días pasan de guardar un proceso a
   anotar con cuánto ofertó (la mediana). Con credencial SIEMPRE: son hábitos de
   cada perfil.
     GET /api/admin?op=uso[&perfil=<id>][&meses=1..13]
   Sin `perfil`, se CENSAN los perfiles por la clave (`uso:*` y los de Mis
   procesos), como el aviso diario: una lista fija dejaría fuera a uno nuevo.
   Un `perfil` o `meses` que no se entiende es INERTE (todos / 3). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerJSON } = require("../../almacen.js");
const U = require("../../uso.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({ ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  }
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Use GET: el uso solo se consulta." });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  const redis = crearRedis({});
  const pedido = String(q.perfil || "").trim();
  const filtro = PERFIL_RE.test(pedido) ? pedido : null;
  const mesesPedidos = parseInt(q.meses, 10);
  const meses = Number.isInteger(mesesPedidos) && mesesPedidos >= 1 && mesesPedidos <= 13 ? mesesPedidos : 3;

  let perfiles;
  try {
    if (filtro) perfiles = [filtro];
    else {
      const set = new Set();
      for (const k of (await redis.scan("uso:*")) || []) { const m = /^uso:([^:]+):\d{4}-\d{2}$/.exec(String(k)); if (m && PERFIL_RE.test(m[1])) set.add(m[1]); }
      const { perfilesGuardados } = require("../perfil/seguimiento.js");
      for (const p of await perfilesGuardados(redis)) set.add(p);
      perfiles = [...set].sort();
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo leer qué perfiles tienen uso anotado: ${String((e && e.message) || e)}`, que_hacer: "Vuelva a pegar esta misma dirección en unos minutos." });
  }

  const salida = [];
  for (const p of perfiles) {
    const porMes = await U.leerUso(redis, p, { meses });
    let decidir = { procesos: 0, mediana_dias: null, leido: true };
    try {
      const g = await leerJSON(redis, `seguimiento:${p}`);
      decidir = { ...U.diasHastaOfertar(g && g.procesos), leido: true };
    } catch { decidir = { procesos: null, mediana_dias: null, leido: false }; }
    salida.push({ perfil: p, por_mes: porMes, de_guardar_a_ofertar: decidir });
  }

  return res.status(200).json({
    ok: true, perfil: filtro, nota: pedido && !filtro ? "El perfil que pidió no se pudo leer, así que se muestran todos." : null,
    meses, eventos: U.EVENTOS, perfiles: salida,
    como_leerlo: "Cuántas veces se hizo cada cosa con cada perfil, por mes (el mes de Colombia). Es un PISO: si la base de datos tardó más de un instante en anotar, esa vez no se contó, y cuenta lo que se hizo con el perfil, lo haga quien lo haga (la página no distingue al dueño de un visitante que use el mismo perfil). Un 0 es un conteo: se miró y no hubo; un mes con «leido: false» no se pudo leer. «de_guardar_a_ofertar» es la mediana de días entre guardar un proceso en Mis procesos y anotar con cuánto ofertó, sobre los procesos que tienen las dos fechas.",
  });
};
