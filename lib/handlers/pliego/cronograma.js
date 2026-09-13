/* lib/handlers/pliego/cronograma.js · /api/pliego?op=cronograma (Fase 5)
     GET  ?id_proceso=…[&formato=ics]      → hitos del DATASET (publicación, cierre) +
                                             los del último texto de pliego guardado
                                             (pliego:{proceso}:v:{n}), avisos T-7/T-3/T-1.
     POST {id_proceso?, texto}[&formato=ics] → ídem con el texto que se manda.
   Público PARA LEER: son fechas del proceso. `formato=ics` devuelve text/calendar.
   Las dos ESCRITURAS (la fecha límite de manifestación y la de adjudicación que
   se persisten para otras pantallas) exigen credencial — ver abajo. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
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

/* EL TEXTO DEL PLIEGO YA GUARDADO, por id de proceso. Lo estrenó el cronograma
   y lo necesita igual el lector de deducciones: son dos lecturas del MISMO
   documento. Se extrae aquí en vez de copiarse porque dos formas de «conseguir
   el texto» divergen a la primera corrección — la lección que este repositorio
   ya pagó con el lector de cuerpos. Sin texto guardado devuelve vacío y NUNCA
   lanza: que no haya pliego cargado es un resultado, no un error. */
async function textoGuardado(redis, id) {
  try {
    const idx = await D.leerIndice(redis, id);
    const u = idx.versiones[idx.versiones.length - 1];
    if (!u) return { texto: "", version: null };
    const v = await D.leerVersion(redis, id, u.n);
    /* `recortado`, `hash` y `origen` son ADITIVOS (2-sep-2026): el dictamen del
       pliego los necesita (la clave de su caché lleva el hash de la versión y la
       pantalla dice si el texto está recortado); cronograma y deducciones ignoran
       las claves que no leen. */
    return v
      ? { texto: v.texto_normalizado || "", version: u.n, recortado: !!v.recortado, hash: v.hash || u.hash || null, origen: v.origen || u.origen || null }
      : { texto: "", version: null };
  } catch { return { texto: "", version: null }; }
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const metodo = String(req.method || "GET").toUpperCase();
  /* LEER ES PÚBLICO; ESCRIBIR NO (12-sep-2026). Este endpoint PERSISTE dos
     fechas tomadas del texto que le manden —la límite para manifestar interés y
     la de adjudicación— y no pedía nada: cualquiera que conociera la URL movía
     la tarjeta de un proceso de «verifique HOY si sigue abierto» a «vence el 13
     de septiembre» con `confirmada: true`, que es justo la afirmación que costó
     el defecto de Motavita. Token OPCIONAL, el patrón EXACTO de
     procesos?op=listar y perfil?op=pulso: ausente → se sirven los hitos leídos y
     no se escribe nada; PRESENTE pero inválido → 401, jamás degradación
     silenciosa (quien lo mandó tiene que enterarse de que no vale). Va antes de
     cualquier otra comprobación, como allí. */
  const tokenPresente = !!((req.headers && req.headers["x-historico-token"]) || q.token);
  let puedeGuardar = false;
  if (tokenPresente) {
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false, error: permiso.error,
        ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
      });
    }
    puedeGuardar = true;
  }
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
      const t = await textoGuardado(redis, id);
      texto = t.texto; versionTexto = t.version;
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
  let manifGuardada = null, manifSinCredencial = false;
  const hitoManif = id && redis ? (delPliego.hitos || []).find((h) => h.id === "manifestacion") : null;
  if (hitoManif && hitoManif.fecha && !puedeGuardar) manifSinCredencial = true;
  if (hitoManif && hitoManif.fecha && puedeGuardar) {
    const r = await Manif.guardarFechaCronograma(redis, id, hitoManif.fecha, { hoy });
    if (r.guardada) manifGuardada = hitoManif.fecha;
  }
  /* Y LA FECHA DE ADJUDICACIÓN DEL PLIEGO (M-DGF-08, 6-sep-2026), por la misma
     vía: el calendario de cierres la enseña en vez de la estimada por el
     histórico cuando existe — un publicado gana a un calculado. Solo la del
     PLIEGO: el dataset no trae hito de adjudicación futuro. */
  let adjGuardada = null, adjSinCredencial = false;
  const hitoAdj = id && redis ? (delPliego.hitos || []).find((h) => h.id === "adjudicacion") : null;
  if (hitoAdj && hitoAdj.fecha && !puedeGuardar) adjSinCredencial = true;
  if (hitoAdj && hitoAdj.fecha && puedeGuardar) {
    const r = await Manif.guardarFechaCronograma(redis, id, hitoAdj.fecha, { hoy, clave: Manif.CLAVE_CRONOGRAMA_ADJUDICACION });
    if (r.guardada) adjGuardada = hitoAdj.fecha;
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
    // la fecha de adjudicación del pliego, si la trae: el calendario la prefiere a la estimada
    adjudicacion_fecha_guardada: adjGuardada,
    /* LA AUSENCIA DE ESCRITURA NO PUEDE SER MUDA: si el pliego traía alguna de
       las dos fechas y no llegó credencial, se dice por qué no se guardó. Solo
       aparece cuando de verdad había algo que guardar. */
    ...(manifSinCredencial || adjSinCredencial
      ? { fechas_no_guardadas: "requiere credencial: los hitos que acaba de leer se le devuelven igual, pero las fechas que "
          + "otras pantallas reutilizan (la límite para manifestar interés y la de adjudicación) solo se guardan con la llave "
          + "de la aplicación." }
      : {}),
    fuentes: { dataset: delDataset.length, pliego: delPliego.hitos.length, version_texto: versionTexto, lineas_hito_sin_fecha: delPliego.lineas_hito_sin_fecha, proceso_en_corpus: !!fila },
    ics_url: id ? `/api/pliego?op=cronograma&id_proceso=${encodeURIComponent(id)}&formato=ics` : null,
    como_leerlo: "Cada hito trae su origen (SECOP II o el cronograma del pliego) y la línea de la que salió. Los avisos son a 7, 3 y 1 día de cada hito futuro; el .ics los lleva como alarmas del calendario. Un hito cuya fecha no se pudo leer NO se inventa: se cuenta en lineas_hito_sin_fecha.",
  });
};
module.exports.textoGuardado = textoGuardado;
/* La fila del corpus por id, compartida con el dictamen del pliego (2-sep-2026):
   una segunda forma de «conseguir la fila» divergiría igual que la del texto. */
module.exports.filaDe = filaDe;
