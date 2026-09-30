/* ============================================================================
   /api/procesos?op=latido · ¿Quedó algo a medias? Si quedó, un tramo (27-sep-2026)
   ----------------------------------------------------------------------------
   GET, con la MISMA autorización que la sincronización (Bearer del cron o la
   llave). Lee en UN MGET la meta, los dos cursores y los dos candados, decide
   con lib/latido.decidirLatido y, si toca, llama EN ESTE PROCESO al handler de
   siempre —op=sync&modo=auto o op=historico con el rango de su cursor—, con
   `chain=0`: el tramo siguiente lo lanza el latido siguiente, no una llamada
   suelta. La respuesta dice qué hizo y por qué, y trae la del handler.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarSincronizacion } = require("../../auth.js");
const { CLAVES } = require("../../almacen.js");
const { decidirLatido } = require("../../latido.js");

/* Invoca un handler en este mismo proceso y devuelve {status, cuerpo}. */
function invocarAqui(handler, query, headers) {
  return new Promise((resolve, reject) => {
    const res = {
      _s: 200, setHeader() {},
      status(n) { this._s = n; return this; },
      json(o) { resolve({ status: this._s, cuerpo: o }); },
      send(b) { resolve({ status: this._s, cuerpo: b }); },
      end() { resolve({ status: this._s, cuerpo: null }); },
    };
    Promise.resolve(handler({ method: "GET", url: "/api/procesos", query, headers }, res)).catch(reject);
  });
}

/* EL AVISO POR CORREO DE LA SALUD (30-sep-2026, lib/aviso_salud). El latido ya corre cada 10
   min: lee `op=salud` en este proceso y, si sigue en rojo 20 min, manda el correo de siempre
   (lib/correo). Nunca tumba el latido: un fallo aquí se dice en la respuesta y se sigue. */
async function avisarSiHaceFalta(redis, req) {
  try {
    const { decidirAvisoSalud, plantillaAviso } = require("../../aviso_salud.js");
    const salud = await invocarAqui(require("./salud.js"), {}, {});
    const c = salud.cuerpo || {};
    const previo = json(await redis.get(CLAVES.avisoSalud));
    const d = decidirAvisoSalud({ previo: previo === undefined ? null : previo, ok: salud.status === 200 ? c.ok : undefined, motivos: typeof c.motivo === "string" && c.motivo ? c.motivo.split("; ") : [] });
    let envio = null;
    if (d.enviar) {
      const host = req && req.headers && (req.headers["x-forwarded-host"] || req.headers.host);
      const url = host ? `https://${host}/api/procesos?op=salud` : null;
      envio = await require("../../correo.js").enviarCorreo(plantillaAviso(d.enviar, { estado: d.estado, motivos: d.estado ? d.estado.motivos : [], url }));
      // un envío que falló no cuenta como avisado: el siguiente latido lo reintenta
      if (envio.ok && d.estado) d.estado.avisado_ts = new Date().toISOString();
      if (!envio.ok && d.enviar === "recuperada") d.estado = previo;
    }
    // solo se escribe lo que cambió: un rojo quieto no gasta un comando cada 10 min
    if (d.estado) { if (JSON.stringify(d.estado) !== JSON.stringify(previo)) await redis.set(CLAVES.avisoSalud, JSON.stringify(d.estado)); }
    else if (previo) await redis.del(CLAVES.avisoSalud);
    return { salud_ok: c.ok === true ? true : c.ok === false ? false : null, enviado: d.enviar && envio && envio.ok ? d.enviar : null,
      ...(envio && !envio.ok ? { fallo: envio.motivo } : {}) };
  } catch (e) {
    return { salud_ok: null, enviado: null, fallo: `no se pudo revisar la salud: ${require("../../apu_ocr.js").tacharClave(e && e.message)}` };
  }
}

const json = (v) => { try { return v == null ? null : JSON.parse(v); } catch { return undefined; } };

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const guarda = autorizarSincronizacion(req, q);
  if (!guarda.ok) return res.status(guarda.status).json({ ok: false, error: guarda.error, como_autenticar: guarda.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN" });

  const redis = crearRedis({});
  let crudo;
  try {
    crudo = await redis.mget([CLAVES.meta, CLAVES.progreso, CLAVES.progresoHistorico, CLAVES.lock, CLAVES.lockHistorico, CLAVES.derivadosHechos, CLAVES.latidoUltimo, CLAVES.respaldoConfiguradoDesde]);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  const [meta, progreso, progresoHist] = crudo.slice(0, 3).map(json);
  const derivados = json(crudo[5]);
  // un estado ilegible es «no sé»: el latido no actúa a ciegas sobre un cursor que no puede leer
  if ([meta, progreso, progresoHist, derivados].includes(undefined)) {
    return res.status(200).json({ ok: false, accion: "nada", motivo: "el estado de la sincronización no se puede leer", que_hacer: "Abra /api/procesos?op=salud y revise el último error." });
  }
  /* LAS MARCAS QUE LEE op=salud (27-sep-2026). El latido deja su hora solo si la
     anterior tiene 30 min o más —en reposo sigue costando un comando casi siempre—, y
     la primera vez que ve el almacén de la copia configurado anota desde cuándo: sin
     esa fecha, una copia que NUNCA corrió no tenía desde cuándo contar sus 48 h. Un
     fallo al anotar no detiene el latido: la marca es vigilancia, no el trabajo. */
  try {
    // como texto JSON: op=salud las lee en su MGET con leerVariosJSON
    const ahoraIso = JSON.stringify(new Date().toISOString());
    const previo = Date.parse(json(crudo[6]));
    if (!Number.isFinite(previo) || Date.now() - previo >= 30 * 60e3) await redis.set(CLAVES.latidoUltimo, ahoraIso);
    if (!crudo[7] && require("../../objetos.js").faltan().length === 0) await redis.set(CLAVES.respaldoConfiguradoDesde, ahoraIso, { nx: true });
  } catch { /* la vigilancia no tumba el latido */ }
  const aviso = await avisarSiHaceFalta(redis, req);
  const d = decidirLatido({ meta, progreso, progresoHist, derivados, candadoSync: crudo[3], candadoHist: crudo[4] });
  if (d.accion === "nada") return res.status(200).json({ ok: true, ...d, aviso });

  /* las cabeceras con que llegó el latido (Bearer del cron) sirven a op=sync, que usa la
     misma guarda; y la llave de la aplicación va SIEMPRE que el servidor la tenga: quien
     pega la URL con «&token=…» pasó la guarda del latido por la query, y esa query no
     viaja al tramo (reproducido: 401 de op=sync con CRON_SECRET puesto) */
  const headers = { ...(req.headers || {}), ...(process.env.HISTORICO_TOKEN ? { "x-historico-token": process.env.HISTORICO_TOKEN } : {}) };
  let r;
  try {
    if (d.accion === "sync") {
      r = await invocarAqui(require("./sync.js"), { modo: "auto", chain: "0" }, headers);
    } else {
      // op=historico exige la llave de la aplicación; el servidor la conoce
      if (!process.env.HISTORICO_TOKEN) {
        return res.status(200).json({ ok: false, ...d, hecho: false, que_hacer: "Falta HISTORICO_TOKEN en Vercel: sin ella el latido no puede continuar la extracción del histórico." });
      }
      r = await invocarAqui(require("./historico.js"), { desde: d.desde, hasta: d.hasta, chain: "0" }, headers);
    }
  } catch (e) {
    return res.status(502).json({ ok: false, ...d, hecho: false, error: `El tramo falló: ${require("../../apu_ocr.js").tacharClave(e && e.message)}` });
  }
  // «hecho» es que el tramo RESPONDIÓ bien; un tramo que falló no se da por hecho
  return res.status(r.status >= 400 ? 502 : 200).json({ ok: r.status < 400, ...d, aviso, hecho: r.status < 400, respuesta: { status: r.status, cuerpo: r.cuerpo } });
};
