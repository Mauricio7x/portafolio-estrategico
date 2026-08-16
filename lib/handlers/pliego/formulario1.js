/* lib/handlers/pliego/formulario1.js · POST /api/pliego?op=formulario1 (Fase 4)
   Guardián del Formulario 1: recibe la oferta del usuario, el Formulario 1
   leído del pliego, el presupuesto oficial y (opcional) tope de AIU y lo
   escrito en SECOP II; devuelve el semáforo con frases. Con token (la oferta
   son cifras del usuario). Si viene `id_proceso` y `perfil`, guarda el último
   resultado en `formulario1:{proceso}:{perfil}` (TTL 90 días). No lee el
   corpus ni dispara nada. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { validarFormulario1 } = require("../../formulario1.js");

const MAX_BYTES = 2 * 1024 * 1024;
const TTL_SEG = 90 * 86400;
const claveDe = (proceso, perfil) => `formulario1:${proceso}:${perfil}`;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const proceso = String(q.id_proceso || "").trim(), perfil = String(q.perfil || "").trim();
    if (!proceso || !perfil) return res.status(200).json({ ok: true, analizado: false, como_hacerlo: "POST {oferta:{items,aiu,total}, formulario:{items}, presupuesto_oficial, tope_aiu_pct?, secop?, id_proceso?, perfil?}" });
    if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
    const raw = await crearRedis({}).get(claveDe(proceso, perfil));
    let guardado = null; try { guardado = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { guardado = null; }
    return res.status(200).json({ ok: true, analizado: !!guardado, resultado: guardado });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use POST con la oferta y el Formulario 1." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  const resultado = validarFormulario1(datos);
  const salida = { ok: true, ...resultado, revisado_el: new Date().toISOString(), id_proceso: datos.id_proceso || null, perfil: datos.perfil || null,
    como_leerlo: "El semáforo es la peor severidad presente: «revisar» = hay al menos un motivo de rechazo automático (insubsanable); «precaucion» = puede presentarse pero conviene tener lista la justificación de precio; «listo» = nada que lo tumbe. Lo «sin_referencia» no cambia el color: son datos que no se cargaron (SECOP II, tope de AIU, Formulario 1 del pliego)." };
  if (datos.id_proceso && datos.perfil && hayCredenciales()) {
    try { await crearRedis({}).set(claveDe(String(datos.id_proceso).slice(0, 120), String(datos.perfil).slice(0, 60)), JSON.stringify(salida), { ex: TTL_SEG }); salida.guardado = true; } catch { salida.guardado = false; }
  }
  return res.status(200).json(salida);
};
