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
/* QUÉ TEXTO ES «EL PLIEGO» (18-oct-2026). Hasta hoy, la última versión del vigía de adendas: el documento base (el
   pliego tipo) no entra al vigía —a propósito, 27-sep-2026— y en 85 de 228 licitaciones de obra el dictamen decía «no
   hay texto» con el pliego leído; y un anexo con «pliego» en el nombre leído después del pliego quedaba de último (7 de
   228). Ahora manda el DOCUMENTO leído que es el pliego (Docs.candidatosAlTextoDelPliego, la misma regla del vigía):
   · si ese documento entró al vigía, su versión se lee de ahí (el mismo texto y el mismo sello de caché que antes);
   · si no (el documento base), su texto guardado, con el mismo tope de 400 KB del vigía (el dictamen lo manda entero);
   · lo que el dueño CARGÓ A MANO (origen distinto de «documentos:…»; es como se lee un pliego de más de 20 MB que la
     lectura automática no trae) frente a un pliego del vigía: el registrado después, como en main; frente al documento
     base, gana salvo que SECOP II lo haya publicado DESPUÉS del día de la carga (1.ª revisión adversaria: comparar con la
     hora de lectura dejaba ganar al documento base del 29-ene sobre el del 12-feb cargado a mano, CO1.REQ.10168183; 2.ª:
     comparar fechas también contra los pliegos del vigía dejaba ganar al Formulario 1 soltado en Precios);
   · si en el índice hay un pliego o documento base definitivo MÁS NUEVO que el elegido y sin leer (más de 20 MB, un
     escaneo…), se dice en `mas_nuevo_sin_leer`: el dictamen no opina sobre una versión vieja sin avisarlo;
   · sin documentos leídos, la última versión del vigía que sea del pliego (nunca un anexo de la lectura automática).
   `texto_id` es la identidad del texto (el número de versión, o «doc:<id>:<sello>»): con él se compara el pedido de
   lectura; `documento` dice de qué archivo salió. */
async function textoGuardado(redis, id) {
  const vacio = { texto: "", version: null, texto_id: null, documento: null };
  try {
    const Docs = require("../../documentos_proceso.js");
    const { leerJSONComprimido } = require("../../almacen.js");
    const idx = await D.leerIndice(redis, id);
    const versiones = Array.isArray(idx.versiones) ? idx.versiones : [];
    /* `recortado`, `hash` y `origen` son ADITIVOS (2-sep-2026): el dictamen del
       pliego los necesita (la clave de su caché lleva el hash de la versión y la
       pantalla dice si el texto está recortado); cronograma y deducciones ignoran
       las claves que no leen. */
    const desdeVigia = async (u, documento = null) => {
      const v = await D.leerVersion(redis, id, u.n);
      return v && v.texto_normalizado
        ? { texto: v.texto_normalizado, version: u.n, recortado: !!v.recortado, hash: v.hash || u.hash || null, origen: v.origen || u.origen || null, texto_id: u.n, documento }
        : null;
    };
    const automatica = (u) => String(u.origen || "").startsWith("documentos:");
    let docs = null;
    try { docs = await leerJSONComprimido(redis, Docs.claveDocs(id)); } catch { docs = null; }
    const candidatos = Docs.candidatosAlTextoDelPliego(docs);
    /* lo manual que un pliego leído DESPUÉS ya reemplazó en el vigía no compite (en main tampoco: daba el último) */
    const ultimaManual = [...versiones].reverse().find((u) => !automatica(u)) || null;
    const manual = ultimaManual && !candidatos.some((c) => c.version_pliego != null && c.version_pliego > ultimaManual.n) ? ultimaManual : null;
    /* el DÍA de Colombia en que se guardó una versión del vigía (`fecha` es ISO en UTC: desde las 19:00 ya es el día
       siguiente, y una carga de las 20:30 se contaba un día tarde) */
    const diaDe = (u) => { const ms = Date.parse(String((u && u.fecha) || "")); return Number.isFinite(ms) ? hoyColombia(ms) : ""; };
    const diaManual = diaDe(manual);
    /* LO CARGADO A MANO NO DICE QUÉ ARCHIVO ES: Precios manda al vigía igual el pliego que el Formulario 1 de cantidades
       (2.ª revisión adversaria, 18-oct-2026: con la fecha de publicación, un Formulario 1 soltado en Precios ANTES de la
       lectura automática le ganaba al pliego y el dictamen pasaba de «no conviene» a «falta información»). Por eso:
       · frente a los pliegos que ENTRARON al vigía manda el orden del vigía, como en main: si uno se registró después, lo
         manual ya no compite (arriba; si no, lo hermano: el Formulario le ganaba al pliego por medio de un documento base
         más nuevo que el pliego), y si todos se registraron antes, gana lo manual;
       · frente a uno que NO entró (el documento base, que main nunca leía: ahí daba siempre lo manual), lo manual cede solo
         ante uno publicado en SECOP II después del día de la carga; a igual día o sin fecha, lo manual, como en main */
    const tapaLoManual = (c) => c.version_pliego == null && !!c.fecha_carga && !!diaManual && String(c.fecha_carga).slice(0, 10) > diaManual;
    const masNuevoSinLeer = (c) => Docs.definitivoMasNuevoSinLeer(docs, c);
    /* una versión del vigía sin documento detrás (la carga a mano, o la de un índice viejo): lo publicado DESPUÉS del día
       en que se guardó también es más nuevo que ella —el hermano del aviso; sin él, quien cargó a mano el pliego de 30 MB
       no se enteraba de la adenda de 25 MB que vino después— */
    const desdeVigiaSola = async (u) => {
      const r = await desdeVigia(u);
      const dia = diaDe(u);
      return r ? { ...r, mas_nuevo_sin_leer: dia ? Docs.definitivoMasNuevoSinLeer(docs, { fecha_carga: dia }) : null } : null;
    };
    for (const c of candidatos) {
      if (manual && !tapaLoManual(c)) { const r = await desdeVigiaSola(manual); if (r) return r; }
      const documento = { tipo: c.tipo_legible || null, nombre: c.nombre || null, id_documento: c.id_documento };
      const u = c.version_pliego != null ? versiones.find((x) => x.n === c.version_pliego) : null;
      if (u) { const r = await desdeVigia(u, documento); if (r) return { ...r, mas_nuevo_sin_leer: masNuevoSinLeer(c) }; }
      let g = null;
      try { g = await leerJSONComprimido(redis, Docs.claveDoc(id, c.id_documento)); } catch { g = null; }
      if (g && g.texto_normalizado) {
        const largo = g.texto_normalizado.length > D.MAX_TEXTO;
        const hash = g.hash || null;
        return { texto: largo ? g.texto_normalizado.slice(0, D.MAX_TEXTO) : g.texto_normalizado, version: null, recortado: !!g.recortado || largo, hash,
          origen: `documentos:${String(c.nombre || "").slice(0, 40)}`, texto_id: `doc:${c.id_documento}:${String(hash || "").slice(0, 12)}`, documento,
          mas_nuevo_sin_leer: masNuevoSinLeer(c) };
      }
    }
    for (const u of [...versiones].reverse()) {
      if (automatica(u) && !Docs.esVersionDelPliego({ tipo: "pliego", nombre: String(u.origen).slice("documentos:".length) })) continue;
      const r = await desdeVigiaSola(u);
      if (r) return r;
    }
    return vacio;
  } catch { return vacio; }
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
    /* La HORA viaja con la fecha: es lo que permite distinguir «faltan siete
       horas» de «17 horas de tiempo transcurrido» el día del vencimiento. Si la
       línea no la traía inequívoca, va null y no cambia nada. */
    const r = await Manif.guardarFechaCronograma(redis, id, hitoManif.fecha, { hoy, hora: hitoManif.hora || null });
    if (r.guardada) manifGuardada = hitoManif.hora ? `${hitoManif.fecha} ${hitoManif.hora}` : hitoManif.fecha;
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
