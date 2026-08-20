/* lib/handlers/pliego/cronograma.js · /api/pliego?op=cronograma (Fase 5)
     GET  ?id_proceso=…[&formato=ics]      → hitos del DATASET (publicación, cierre) +
                                             los del último texto de pliego guardado
                                             (pliego:{proceso}:v:{n}), avisos T-7/T-3/T-1.
     POST {id_proceso?, texto}[&formato=ics] → ídem con el texto que se manda.
   Público: son fechas del proceso. `formato=ics` devuelve text/calendar. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { leerCuerpo } = require("../../cuerpo.js");
const C = require("../../cronograma.js");
const D = require("../../diff.js");
const { hoyColombia } = require("../../habiles.js");
const Manif = require("../../manifestacion.js");

const MAX_BYTES = 3 * 1024 * 1024;

async function filaDe(redis, id) {
  if (!id || !redis) return null;
  const { cargarCorpus } = require("../procesos/listar.js");
  const { CLAVES, leerJSON } = require("../../almacen.js");
  const meta = await leerJSON(redis, CLAVES.meta);
  const filas = await cargarCorpus(redis, meta);
  return filas ? filas.find((l) => l.id_del_proceso === id) || null : null;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const metodo = String(req.method || "GET").toUpperCase();
  let id = String(q.id_proceso || "").trim(), texto = "";
  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    id = String((cuerpo.datos && cuerpo.datos.id_proceso) || id).trim();
    texto = String((cuerpo.datos && cuerpo.datos.texto) || "");
  }
  if (!id && !texto) return res.status(400).json({ ok: false, error: "Falta id_proceso o el texto del pliego." });
  const redis = hayCredenciales() ? crearRedis({}) : null;
  let fila = null, versionTexto = null;
  try { fila = await filaDe(redis, id); } catch { fila = null; }
  if (!texto && id && redis) {
    try { const idx = await D.leerIndice(redis, id); const u = idx.versiones[idx.versiones.length - 1]; if (u) { const v = await D.leerVersion(redis, id, u.n); if (v) { texto = v.texto_normalizado || ""; versionTexto = u.n; } } } catch { /* sin texto guardado */ }
  }
  const delDataset = fila ? C.hitosDeFila(fila) : [];
  const delPliego = texto ? C.extraerHitos(texto) : { hitos: [], lineas_hito_sin_fecha: 0 };
  const hitos = C.combinarHitos(delDataset, delPliego.hitos);
  const hoy = hoyColombia(Date.now());
  const avisos = C.avisosDe(hitos, hoy);
  /* PELDAÑO 1 DE LA MANIFESTACIÓN. Si el pliego trae la fecha límite REAL para
     avisar que le interesa, se PERSISTE aquí (un campo) para que el listado y
     Mis procesos dejen de calcular una ventana y digan el día exacto. Solo se
     guarda la del PLIEGO: la del dataset es la publicación, no el plazo. Es
     best-effort — `guardarFechaCronograma` no lanza — porque esto mejora otra
     pantalla y no puede tumbar la lectura del cronograma que se pidió. */
  let manifGuardada = null;
  const hitoManif = id && redis ? (delPliego.hitos || []).find((h) => h.id === "manifestacion") : null;
  if (hitoManif && hitoManif.fecha) {
    const r = await Manif.guardarFechaCronograma(redis, id, hitoManif.fecha, { hoy });
    if (r.guardada) manifGuardada = hitoManif.fecha;
  }
  if (String(q.formato || "").toLowerCase() === "ics") {
    const cal = C.ics(hitos, { proceso: id, entidad: fila ? fila.entidad : "" });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="cronograma_${(id || "proceso").replace(/[^A-Za-z0-9._-]/g, "_")}.ics"`);
    return res.status(200).send(cal);
  }
  return res.status(200).json({
    ok: true, id_proceso: id || null, hoy, hitos, avisos,
    /* la fecha límite para avisar que le interesa, si el pliego la trae: a
       partir de ahora la tarjeta del proceso dice el día en vez de la ventana */
    manifestacion_fecha_guardada: manifGuardada,
    fuentes: { dataset: delDataset.length, pliego: delPliego.hitos.length, version_texto: versionTexto, lineas_hito_sin_fecha: delPliego.lineas_hito_sin_fecha, proceso_en_corpus: !!fila },
    ics_url: id ? `/api/pliego?op=cronograma&id_proceso=${encodeURIComponent(id)}&formato=ics` : null,
    como_leerlo: "Cada hito trae su origen (SECOP II o el cronograma del pliego) y la línea de la que salió. Los avisos son a 7, 3 y 1 día de cada hito futuro; el .ics los lleva como alarmas del calendario. Un hito cuya fecha no se pudo leer NO se inventa: se cuenta en lineas_hito_sin_fecha.",
  });
};
