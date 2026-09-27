/* ============================================================================
   /api/admin?op=respaldo · La copia nocturna fuera de Upstash (27-sep-2026)
   ----------------------------------------------------------------------------
   GET /api/admin?op=respaldo              una vuelta de copia (la dispara el cron
                                           de Vercel cada noche: /api/respaldo)
   GET /api/admin?op=respaldo&estado=1     qué hay copiado y de cuándo (solo lee Redis)
   GET /api/admin?op=respaldo&prueba=1     baja la copia y la comprueba mes a mes
   GET /api/admin?op=respaldo&forzar=1     vuelve a subir todos los meses

   Autorización: la MISMA regla de la sincronización (lib/auth.autorizarSincronizacion):
   el Bearer del cron o la llave de la aplicación. Sin el almacén de archivos
   configurado responde 503 con QUÉ variable falta y dónde se pone: una copia
   que «salió bien» sin haberse guardado es exactamente el defecto que esto
   viene a quitar. Lo que se copia y por qué: lib/respaldo.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarSincronizacion } = require("../../auth.js");
const { CLAVES, leerJSON } = require("../../almacen.js");
const { faltan, crearObjetos } = require("../../objetos.js");
const { respaldar, verificarRespaldo, saludDelRespaldo } = require("../../respaldo.js");

const PRESUPUESTO_MS = () => Math.min(Math.max(parseInt(process.env.RESPALDO_PRESUPUESTO_MS, 10) || 240000, 10000), 280000);
const si = (v) => ["1", "true", "si", "sí"].includes(String(v || "").toLowerCase());
const QUE_HACER_CONFIGURAR = "Cree el almacén de archivos en https://dash.cloudflare.com/ (R2 object storage → Create bucket, y en API Tokens → Manage "
  + "una llave con permiso Object Read and Write), pegue las variables que faltan en Vercel (Settings → Environment Variables) "
  + "y vuelva a desplegar (Deployments → … → Redeploy).";

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarSincronizacion(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Método no permitido: la copia se pide con GET." });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  const redis = crearRedis({});
  const falta = faltan();

  if (si(q.estado)) {
    let estado;
    try { estado = await leerJSON(redis, CLAVES.respaldoEstado); } catch (e) {
      return res.status(502).json({ ok: false, error: `No se pudo leer el estado de la copia: ${e.message}` });
    }
    return res.status(200).json({
      ok: true,
      ...saludDelRespaldo(estado, { configurado: falta.length === 0, falta }),
      meses: (estado && estado.meses) || {},
      usuario: (estado && estado.usuario) || null,
      ultima_vuelta: (estado && estado.ultima_vuelta) || null,
      que_hacer: falta.length ? QUE_HACER_CONFIGURAR : null,
    });
  }

  if (falta.length) {
    return res.status(503).json({ ok: false, configurado: false, falta, error: `La copia no se hizo: falta configurar el almacén de archivos (${falta.join(", ")}).`, que_hacer: QUE_HACER_CONFIGURAR });
  }
  const objetos = crearObjetos();
  const hasta = Date.now() + PRESUPUESTO_MS();

  if (si(q.prueba)) {
    try {
      const r = await verificarRespaldo(objetos, { hasta });
      return res.status(r.ok ? 200 : 409).json({
        ...r,
        mensaje: r.ok
          ? `La copia sirve: ${r.meses_verificados} meses y ${r.filas} filas se bajaron y se leyeron completos, y la copia de sus datos está intacta.`
          : r.completa ? "La copia tiene problemas: vea «problemas»." : "No alcanzó el tiempo para revisar todo: vuelva a pedir la prueba.",
      });
    } catch (e) {
      return res.status(502).json({ ok: false, error: `No se pudo comprobar la copia: ${e.message}`, que_hacer: "Vuelva a intentarlo en unos minutos; si se repite, revise las variables del almacén de archivos." });
    }
  }

  try {
    const r = await respaldar(redis, objetos, { hasta, forzar: si(q.forzar) });
    if (r.aplazado) return res.status(200).json({ ok: true, aplazado: true, mensaje: `La copia se aplazó: ${r.motivo}` });
    const partes = [`${r.copiados.length} meses copiados`, `${r.al_dia} ya estaban al día`];
    if (r.pendientes.length) partes.push(`${r.pendientes.length} quedan para la próxima vuelta (no alcanzó el tiempo)`);
    if (r.aplazados.length) partes.push(`${r.aplazados.length} cambiaron mientras se leían y se copian en la próxima vuelta`);
    return res.status(200).json({
      ok: true, ...r,
      mensaje: `${r.completa ? "Copia completa" : "Copia a medias"}: ${partes.join(", ")}; la copia de sus datos se guardó.`,
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: `La copia falló: ${e.message}`, que_hacer: "Si el mensaje habla de firma o de acceso, revise las cuatro variables del almacén de archivos en Vercel; si no, se reintenta la próxima noche." });
  }
};
