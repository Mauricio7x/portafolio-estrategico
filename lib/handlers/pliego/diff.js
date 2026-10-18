/* lib/handlers/pliego/diff.js · /api/pliego?op=diff (Fase 5 · vigía del TEXTO del pliego)
     POST {id_proceso, texto, nombre_archivo, perfil?}  → registra la versión (hash + texto
          normalizado en pliego:{proceso}:v:{n}); si cambió, el diff por párrafos en
          pliego:{proceso}:diff:{n} y los habilitantes reevaluados contra el perfil.
          SALVO si el nombre del archivo dice que es OTRA cosa (ver `queSeCargo`): entonces
          200 con {ok:false, no_es_el_pliego:true, motivo, error} y no se guarda nada.
     GET  ?id_proceso=…&perfil=…               → versiones y último diff (reevaluado).
   Con token (el texto de un pliego es público, pero la reevaluación habla del
   perfil). Cuerpo hasta 3 MB (el texto de un pliego de 120 páginas son ~0,34 MB). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const D = require("../../diff.js");
const Docs = require("../../documentos_proceso.js");

const MAX_BYTES = 3 * 1024 * 1024;
/* La forma de un id de proceso de SECOP II. La exporta (2-sep-2026) porque el
   dictamen del pliego valida el mismo id: dos regex «iguales» divergen. */
const ID_RE = /^[A-Za-z0-9._-]{3,120}$/;

/* LO QUE SE CARGA EN PRECIOS NO SIEMPRE ES EL PLIEGO (18-oct-2026). La pantalla pide también el
   Formulario 1 de cantidades, y TODO archivo leído con un proceso abierto entraba aquí como «versión
   del pliego»: el dictamen, el cronograma y los descuentos leían el formulario (main pasaba de «no
   conviene presentarse» a «falta información» y los descuentos del 4,5 % quedaban sin dato), y el
   vigía comparaba el pliego contra él. Ahora decide el NOMBRE del archivo, con la misma regla de la
   lectura automática (`Docs.clasificarArchivo` + `Docs.esVersionDelPliego`): lo que el nombre dice que
   es OTRA cosa (el formulario o presupuesto, una adenda suelta, un anexo, unas observaciones o sus
   respuestas, unos estudios previos…) no se guarda. Medido en 18.166 archivos reales de dmgg-8hin.
   · Un nombre que NO dice qué es se guarda, como antes (2.ª revisión adversaria): el clasificador no
     reconoce todavía «DocBase_…», «Documento_base_…», «DOCUMENTO%20BASE» ni «Documentos Base», y los 11
     nombres así de la muestra son documentos base reales; en 4 de 33 procesos abiertos, cargarlo aquí
     era el único camino del pliego al dictamen (CO1.REQ.11213139, CO1.REQ.11144592).
   · Una adenda con el nombre del pliego DELANTE («Documento Base … MODIFICADO CON ADENDA No. 1») es el
     pliego con la adenda incorporada y se guarda (3 en la muestra); salvo que sea una propuesta u oferta. */
const plegarNombre = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/* el nombre del pliego va DELANTE de lo otro: «Documento Base … CON ADENDA No. 1» es el pliego con la adenda
   incorporada; «PROYECTO DE PLIEGO, ANEXOS, FORMATOS, MATRICES Y FORMULARIO 1» es el pliego con todo junto
   (CO1.REQ.10367183, 2.ª ronda de la revisión). No si delante dice que es una propuesta, una oferta o el presupuesto */
function pliegoDelante(nombre, reOtro) {
  const n = plegarNombre(nombre);
  const iO = n.search(reOtro), iP = n.search(/pliego|condiciones|documento\s+(?:base|tipo)/);
  if (iO < 0 || iP < 0 || iP > iO) return false;
  if (/propuesta|oferta|presupuesto|cantidades|formulario/.test(n.slice(0, iP))) return false;
  return Docs.esVersionDelPliego({ tipo: "pliego", nombre });
}
const RE_ADENDA = /\badendas?\b/;
const RE_PRESUPUESTO = /presupuesto|cantidades|formulario/;
function queSeCargo(nombreDado) {
  const nombre = String(nombreDado || "").trim().slice(0, 160);
  if (!nombre) return { guardar: true, motivo: null, archivo: null };
  const archivo = Docs.clasificarArchivo({ nombre_archivo: nombre });
  if (Docs.esVersionDelPliego(archivo) || archivo.tipo === "otro") return { guardar: true, motivo: null, archivo };
  if (archivo.tipo === "adenda" && pliegoDelante(archivo.nombre, RE_ADENDA)) return { guardar: true, motivo: null, archivo };
  if (archivo.tipo === "presupuesto" && pliegoDelante(archivo.nombre, RE_PRESUPUESTO)) return { guardar: true, motivo: null, archivo };
  const motivo = archivo.tipo === "presupuesto" ? "formulario"
    : archivo.tipo === "adenda" ? "adenda"
      : (archivo.tipo === "pliego" || archivo.tipo === "pliego_borrador" || archivo.tipo === "documento_base") ? "acompana_al_pliego"
        : "otro_documento";
  return { guardar: false, motivo, archivo };
}
/* la frase dice lo que el dictamen está leyendo DE VERDAD (`textoGuardado`), o que todavía no hay pliego guardado
   (2.ª revisión: decía «siguen leyendo el pliego» sin pliego guardado, y el dictamen debajo decía lo contrario) */
function fraseNoEsElPliego({ motivo, archivo }, leyendo) {
  const nombre = archivo && archivo.nombre ? ` («${archivo.nombre}»)` : "";
  const cola = leyendo
    ? `El dictamen, el cronograma y los descuentos siguen con ${leyendo}`
    : "Todavía no hay pliego guardado de este proceso: cargue aquí el archivo del pliego, el que dice «pliego» o «documento base»";
  const que = motivo === "formulario" ? "el formulario de cantidades (presupuesto oficial), no el pliego: sirve para el precio, pero no se guarda como versión del pliego"
    : motivo === "adenda" ? "una adenda, no el pliego completo, y no se guarda como versión del pliego; las fechas que cambie, confírmelas en SECOP II. Si es el pliego con la adenda ya incorporada, cárguelo con un nombre que empiece por «pliego» o «documento base»"
      : motivo === "acompana_al_pliego" ? "un anexo, un formato o unas observaciones del pliego, no el pliego, y no se guarda como versión del pliego"
        : `«${String((archivo && archivo.tipo_legible) || "otro documento").toLowerCase()}», no el pliego, y no se guarda como versión del pliego`;
  return `Por su nombre${nombre}, este archivo es ${que}. ${cola}`;
}
async function loQueSeLee(redis, id) {
  let t = null;
  try { t = await require("./cronograma.js").textoGuardado(redis, id); } catch { t = null; }
  if (!t || !t.texto) return null;
  if (t.documento && t.documento.nombre) return `«${t.documento.nombre}»`;
  return t.version != null ? `la versión ${t.version} del pliego` : "el pliego guardado";
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const id = String(q.id_proceso || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id_proceso= (el id del proceso en SECOP II)." });
    const r = await D.ultimoDiff(redis, id, String(q.perfil || "").trim() || null);
    return res.status(200).json({ ok: true, id_proceso: id, ...r, cambio: !!(r.diff), como_leerlo: "«diff.habilitantes.cambios» es lo que importa: cada requisito que cambió, con «le afecta» decidido contra el perfil. El diff de párrafos viaja para quien lo quiera ver." });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use POST {id_proceso, texto, perfil?}." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  const id = String(datos.id_proceso || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta id_proceso (el id del proceso en SECOP II, p. ej. CO1.REQ.123)." });
  const texto = String(datos.texto || "");
  if (texto.trim().length < 50) return res.status(400).json({ ok: false, error: "El texto del pliego llegó vacío o demasiado corto para vigilarlo." });
  const que = queSeCargo(datos.nombre_archivo);
  /* 200 y no 4xx: no es un fallo, es una respuesta; `ok:false` hace que un navegador con el código
     de antes diga «No se pudo guardar la versión del pliego: <motivo>», que es la verdad */
  if (!que.guardar) return res.status(200).json({ ok: false, id_proceso: id, guardada: false, no_es_el_pliego: true, motivo: que.motivo, tipo: que.archivo ? que.archivo.tipo : null, error: fraseNoEsElPliego(que, await loQueSeLee(redis, id)) });
  // el origen lleva el nombre: lo cargado a mano deja de ser anónimo (textoGuardado lo trata igual: no empieza por «documentos:»)
  const origen = que.archivo && que.archivo.nombre ? `lector:${que.archivo.nombre}`.slice(0, 40) : "lector";
  const r = await D.registrarVersion(redis, { idProceso: id, texto, origen, perfilId: String(datos.perfil || "").trim() || null });
  return res.status(200).json({
    ok: true, id_proceso: id, ...r,
    mensaje: r.cambio ? "La entidad cambió las reglas de este proceso desde la última vez que lo abrió." : (r.version === 1 ? "Primera vez que se guarda este pliego: a partir de ahora, cada vez que lo abra se comparará con esta versión." : "El pliego no cambió desde la última vez."),
  });
};
module.exports.ID_RE = ID_RE;
module.exports.queSeCargo = queSeCargo;
